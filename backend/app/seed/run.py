"""Seed the demo database: 1 bank admin + 20 merchants with 90 days of data.

    uv run python -m app.seed.run           # seed (idempotent-ish: skips existing emails)
    uv run python -m app.seed.run --reset   # drop everything, then seed

Deterministic (data derives from merchant ids created here with a fixed UUID
namespace), so demos are reproducible.
"""

import argparse
import asyncio
import sys
import uuid
from datetime import date, timedelta

from sqlalchemy import select

from app.db import SessionLocal, create_all, drop_all
from app.domain.enums import ConnectionType, UserRole
from app.domain.models import Merchant, User
from app.security.auth import hash_password
from app.seed.synthetic import profile_for
from app.services import offers as offers_service
from app.services import onboarding, scoring
from app.services.aggregation import aggregate_merchant

ADMIN_EMAIL = "admin@rafid.sa"
ADMIN_PASSWORD = "AdminPass123!"
MERCHANT_PASSWORD = "MerchantPass123!"
_NAMESPACE = uuid.UUID("d3b07384-d9a0-4c9b-8f3a-2f0a4b1e9c11")  # fixed => reproducible ids

MERCHANT_NAMES = [
    "Noor Boutique", "Desert Dates Co", "TechSouq", "Riyadh Roasters", "Zahra Perfumes",
    "Qamar Kids", "Falcon Fitness", "Layla Home", "Sadu Crafts", "Oasis Organics",
    "Majlis Furniture", "Hijaz Honey", "Salam Sweets", "Najd Fashion", "Marjan Jewelry",
    "Wadi Toys", "Amber Cosmetics", "Dune Outdoors", "Lulu Stationery", "Safa Kitchen",
]


async def seed(reset: bool) -> None:
    if reset:
        print("dropping all tables...")
        await drop_all()
    await create_all()

    async with SessionLocal() as session:
        # bank admin
        admin = await session.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if not admin:
            session.add(
                User(
                    email=ADMIN_EMAIL,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role=UserRole.BANK_ADMIN.value,
                )
            )
            await session.commit()
            print(f"admin created: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")

        print(
            f"{'merchant':<20} {'email':<26} {'platforms':<34} "
            f"{'bank':<14} {'risk':<4} {'bnd':<3} {'scr':<4} {'stage':<9}"
        )
        for i, name in enumerate(MERCHANT_NAMES, start=1):
            email = f"merchant{i:02d}@rafid.sa"
            if await session.scalar(select(User).where(User.email == email)):
                print(f"{name:<20} {email:<26} (exists, skipped)")
                continue

            merchant_id = uuid.uuid5(_NAMESPACE, email).hex
            profile = profile_for(merchant_id)
            merchant = Merchant(
                id=merchant_id,
                name=name,
                business_type=profile.sector,
                established_at=date.today() - timedelta(days=profile.account_age_days),
            )
            session.add(merchant)
            await session.flush()
            user = User(
                email=email,
                password_hash=hash_password(MERCHANT_PASSWORD),
                role=UserRole.MERCHANT.value,
                merchant_id=merchant.id,
            )
            session.add(user)
            await session.commit()

            # consent handshake (mock OAuth2) for bank + each sales platform
            for conn_type, institution in [
                (ConnectionType.BANK, profile.bank),
                *[(ConnectionType.SALES, p) for p in profile.platforms],
            ]:
                _, consent, _ = await onboarding.start_consent(
                    session, merchant, conn_type, institution, actor_user_id=user.id
                )
                await onboarding.complete_consent(
                    session, merchant, consent.session_id, "mock-auth-code",
                    actor_user_id=user.id,
                )

            summary = await aggregate_merchant(session, merchant, actor_user_id=user.id)

            # Score every merchant so the underwriter portfolio is populated
            # (risk bands, distribution donut, "scored" funnel stage). Then take
            # a realistic slice down the funnel: approved merchants receive an
            # offer, and roughly every other one accepts it into an active
            # Murabaha contract — so the funnel and contract KPIs aren't empty.
            try:
                assessment = await scoring.run_assessment(
                    session, merchant, actor_user_id=user.id
                )
            except scoring.ScoringError:
                assessment = None

            stage = "scored" if assessment else "-"
            if assessment and assessment.approved:
                try:
                    offer = await offers_service.generate_offer(
                        session, merchant, actor_user_id=user.id
                    )
                    stage = "offered"
                    if i % 2 == 0:
                        await offers_service.accept_offer(
                            session, merchant, offer.id, actor_user_id=user.id
                        )
                        stage = "accepted"
                except offers_service.OfferError:
                    pass

            band = assessment.risk_band if assessment else "--"
            score = assessment.score if assessment else 0
            print(
                f"{name:<20} {email:<26} {','.join(profile.platforms):<34} "
                f"{profile.bank:<14} {'YES' if profile.risky else '-':<4} "
                f"{band:<3} {score:<4} {stage:<9} "
                f"(held {summary.held_receivables_total:,.0f} SAR)"
            )

    print(f"\ndone. merchants login with password: {MERCHANT_PASSWORD}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="drop all tables first")
    args = parser.parse_args()
    try:
        asyncio.run(seed(args.reset))
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main()
