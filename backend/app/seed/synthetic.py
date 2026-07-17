"""Deterministic synthetic data engine.

Everything derives from a merchant_id via hashing, so the MockProvider is
stateless and reproducible: same merchant, same data, every run (plan §16).
~15% of merchants hash out as "risky" (recent revenue drop + settlement
delays) so alerts fire naturally in the demo.
"""

import hashlib
import random
from dataclasses import dataclass
from datetime import date, timedelta

from app.providers.base import (
    BANK_INSTITUTIONS,
    SECTOR_PLATFORMS,
    BankAccount,
    SalesOrder,
    Settlement,
    Transaction,
)

SETTLEMENT_HOLD_DAYS = 3  # payout lag after a cycle window closes
PLATFORM_COMMISSION = 0.05
_ANCHOR = date(2026, 1, 1)  # fixed anchor so trend is window-independent

# Fri/Sat = Saudi weekend, higher e-commerce volume
_WEEKDAY_FACTOR = [0.92, 0.95, 1.0, 1.05, 1.25, 1.3, 1.02]


def _hash_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest()[:12], 16)


def _rng(s: str) -> random.Random:
    return random.Random(_hash_int(s))


@dataclass(frozen=True)
class MerchantProfile:
    merchant_id: str
    sector: str  # "ecommerce" | "food" — decides which aggregator pool
    platforms: list[str]
    bank: str
    base_daily: float  # SAR/day across all platforms
    trend: float  # relative growth over 90 days, e.g. +0.3
    volatility: float  # daily noise level
    cycle_days: int  # settlement cycle
    chargeback_rate: float
    risky: bool
    account_age_days: int
    opening_balance: float


def profile_for(merchant_id: str) -> MerchantProfile:
    r = _rng(f"profile:{merchant_id}")
    sector = r.choice(list(SECTOR_PLATFORMS))
    pool = SECTOR_PLATFORMS[sector]
    # Every merchant sells across multiple aggregators — that unified view is the
    # product. Take most of the sector's pool (min 2), so the dashboard always
    # shows a real channel mix. platforms[0] is the lead channel (see share).
    n_platforms = r.randint(min(2, len(pool)), len(pool))
    platforms = r.sample(pool, n_platforms)
    return MerchantProfile(
        merchant_id=merchant_id,
        sector=sector,
        platforms=platforms,
        bank=r.choice(BANK_INSTITUTIONS),
        base_daily=round(r.uniform(800, 15000), 2),
        trend=r.uniform(-0.25, 0.5),
        volatility=r.uniform(0.08, 0.45),
        cycle_days=r.choice([7, 14, 21, 30]),
        chargeback_rate=r.uniform(0.0, 0.06),
        risky=r.random() < 0.15,
        account_age_days=r.randint(200, 2200),
        opening_balance=round(r.uniform(20_000, 150_000), 2),
    )


def platform_share(profile: MerchantProfile, platform: str) -> float:
    """Each platform's fraction of revenue, deterministic and summing to 1.

    The lead channel (platforms[0]) is weighted up so there is always a
    concentration signal for the engine's CHANNEL/PLATFORM factor to read,
    rather than an unrealistically even split across every aggregator.
    """
    weights: dict[str, float] = {}
    for i, p in enumerate(profile.platforms):
        w = _rng(f"share:{profile.merchant_id}:{p}").uniform(0.4, 1.0)
        weights[p] = w * 2.0 if i == 0 else w
    total = sum(weights.values())
    return weights[platform] / total


def daily_platform_revenue(profile: MerchantProfile, platform: str, d: date,
                           risk_ref: date | None = None) -> float:
    """Deterministic revenue for one platform on one day."""
    g = profile.trend / 90  # daily relative growth
    trend_factor = max(0.2, 1 + g * (d - _ANCHOR).days)
    noise = _rng(f"rev:{profile.merchant_id}:{platform}:{d.isoformat()}").gauss(
        1, profile.volatility
    )
    value = profile.base_daily * platform_share(profile, platform) * trend_factor
    value *= _WEEKDAY_FACTOR[d.weekday()] * max(0.05, noise)
    # engineered risk: revenue collapses in the last 20 days before risk_ref
    if profile.risky and risk_ref and d > risk_ref - timedelta(days=20):
        value *= 0.4
    return round(value, 2)


def generate_sales(profile: MerchantProfile, platform: str, since: date,
                   until: date) -> list[SalesOrder]:
    orders: list[SalesOrder] = []
    d = since
    while d <= until:
        day_revenue = daily_platform_revenue(profile, platform, d, risk_ref=until)
        r = _rng(f"orders:{profile.merchant_id}:{platform}:{d.isoformat()}")
        n = r.randint(2, 9)
        weights = [r.uniform(0.5, 1.5) for _ in range(n)]
        total_w = sum(weights)
        for i, w in enumerate(weights):
            refunded = r.random() < profile.chargeback_rate
            orders.append(
                SalesOrder(
                    external_id=f"ord-{platform}-{d.isoformat()}-{i}",
                    platform=platform,
                    order_date=d,
                    amount=round(day_revenue * w / total_w, 2),
                    status="refunded" if refunded else "completed",
                )
            )
        d += timedelta(days=1)
    return orders


def _window_bounds(d: date, cycle_days: int) -> tuple[date, date]:
    idx = d.toordinal() // cycle_days
    start = date.fromordinal(idx * cycle_days)
    return start, start + timedelta(days=cycle_days - 1)


def generate_settlements(profile: MerchantProfile, platform: str, since: date,
                         today: date) -> list[Settlement]:
    """All settlements whose sales window overlaps [since, today].

    pending = expected payout date is today or later (this is 'held
    receivables'); received = already paid out.
    """
    settlements: list[Settlement] = []
    d = since
    seen: set[date] = set()
    while d <= today:
        w_start, w_end = _window_bounds(d, profile.cycle_days)
        if w_start not in seen:
            seen.add(w_start)
            gross = sum(
                o.amount
                for o in generate_sales(profile, platform, max(w_start, since),
                                        min(w_end, today))
                if o.status == "completed"
            )
            if gross > 0:
                expected = w_end + timedelta(days=SETTLEMENT_HOLD_DAYS)
                settlements.append(
                    Settlement(
                        external_id=f"stl-{platform}-{w_end.isoformat()}",
                        platform=platform,
                        amount=round(gross * (1 - PLATFORM_COMMISSION), 2),
                        expected_date=expected,
                        status="pending" if expected >= today else "received",
                    )
                )
        d += timedelta(days=1)
    return settlements


def generate_account(profile: MerchantProfile) -> BankAccount:
    r = _rng(f"account:{profile.merchant_id}")
    iban = f"SA{r.randint(10, 99)}80{r.randint(10**15, 10**16 - 1)}"
    return BankAccount(
        external_id=f"acc-{profile.merchant_id[:12]}",
        institution=profile.bank,
        iban=iban,
        balance=profile.opening_balance,
    )


def generate_transactions(profile: MerchantProfile, since: date,
                          today: date) -> list[Transaction]:
    """Bank statement: settlement payout credits + weekly expense debits."""
    account = generate_account(profile)
    txns: list[Transaction] = []
    for platform in profile.platforms:
        for s in generate_settlements(profile, platform, since, today):
            if s.status == "received" and s.expected_date >= since:
                txns.append(
                    Transaction(
                        external_id=f"txn-{s.external_id}",
                        account_external_id=account.external_id,
                        date=s.expected_date,
                        amount=s.amount,
                        direction="credit",
                        description=f"{platform} settlement payout",
                        category="settlement",
                    )
                )
    d = since
    while d <= today:
        if d.weekday() == 0:  # weekly ops expenses every Monday
            r = _rng(f"exp:{profile.merchant_id}:{d.isoformat()}")
            txns.append(
                Transaction(
                    external_id=f"txn-exp-{d.isoformat()}",
                    account_external_id=account.external_id,
                    date=d,
                    amount=round(profile.base_daily * r.uniform(0.8, 2.5), 2),
                    direction="debit",
                    description="Operating expenses",
                    category="expenses",
                )
            )
        d += timedelta(days=1)
    return sorted(txns, key=lambda t: t.date)
