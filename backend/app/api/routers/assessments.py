from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMerchant, CurrentUser, SessionDep
from app.domain.models import CreditAssessment
from app.schemas.financing import AssessmentDetailOut, AssessmentOut
from app.services.scoring import ScoringError, run_assessment

router = APIRouter(prefix="/assessments", tags=["scoring"])


@router.post("/run", response_model=AssessmentDetailOut, status_code=status.HTTP_201_CREATED)
async def run(merchant: CurrentMerchant, session: SessionDep, user: CurrentUser):
    try:
        return await run_assessment(session, merchant, actor_user_id=user.id)
    except ScoringError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e


@router.get("/me", response_model=list[AssessmentOut])
async def my_assessments(merchant: CurrentMerchant, session: SessionDep):
    rows = await session.execute(
        select(CreditAssessment)
        .where(CreditAssessment.merchant_id == merchant.id)
        .order_by(CreditAssessment.created_at.desc())
    )
    return list(rows.scalars())


@router.get("/{assessment_id}", response_model=AssessmentDetailOut)
async def get_assessment(
    assessment_id: str, merchant: CurrentMerchant, session: SessionDep
):
    assessment = await session.get(CreditAssessment, assessment_id)
    if not assessment or assessment.merchant_id != merchant.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "assessment not found")
    return assessment
