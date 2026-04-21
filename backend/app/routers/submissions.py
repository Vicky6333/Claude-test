from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..auth import get_current_user, require_hq
from .. import models, schemas
from ..services import ai_service

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

CPM_STANDARDS = {
    "小红书": {"cpm_limit": 40, "interaction_min": 1000},
    "视频号": {"cpm_limit": 60, "interaction_min": 1000},
    "微信图文": {"cpm_limit": 50, "interaction_min": 500},
    "本地媒体": {"cpm_limit": None, "interaction_min": 1000},
}


def _calc_cpm_status(channel: str, cpm: float, interactions: int) -> str:
    standard = CPM_STANDARDS.get(channel, {"cpm_limit": 50, "interaction_min": 1000})
    cpm_limit = standard["cpm_limit"]
    interaction_min = standard["interaction_min"]

    if channel == "本地媒体" or channel == "区域媒体官方账号":
        return "pass" if interactions >= interaction_min else "fail"

    if cpm_limit is None:
        return "pass" if interactions >= interaction_min else "fail"

    interaction_ok = interactions >= interaction_min
    if cpm <= cpm_limit and interaction_ok:
        return "pass"
    elif cpm <= cpm_limit * 1.2 and interaction_ok:
        return "warn"
    else:
        return "fail"


@router.get("", response_model=List[schemas.SubmissionOut])
def list_submissions(
    topic_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.Submission).options(
        joinedload(models.Submission.acceptance)
    )
    if topic_id:
        query = query.filter(models.Submission.topic_id == topic_id)
    elif current_user.role == "region":
        # Region users only see their own submissions
        own_topic_ids = [
            t.id for t in db.query(models.Topic.id).filter(models.Topic.created_by == current_user.id)
        ]
        query = query.filter(models.Submission.topic_id.in_(own_topic_ids))
    return query.order_by(models.Submission.created_at.desc()).all()


@router.post("", response_model=schemas.SubmissionOut)
def create_submission(
    data: schemas.SubmissionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    topic = db.query(models.Topic).filter(models.Topic.id == data.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="选题不存在")

    impressions = data.impressions
    actual_cost = data.actual_cost
    cpm = (actual_cost / impressions * 1000) if impressions > 0 else 0
    cpm_status = _calc_cpm_status(topic.channel, cpm, data.interactions)

    submission = models.Submission(
        **data.model_dump(),
        cpm=round(cpm, 2),
        cpm_status=cpm_status,
        created_by=current_user.id,
    )
    db.add(submission)

    topic.status = "已完成"
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/{submission_id}", response_model=schemas.SubmissionOut)
def get_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    submission = (
        db.query(models.Submission)
        .options(joinedload(models.Submission.acceptance))
        .filter(models.Submission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="成果不存在")
    return submission


@router.post("/{submission_id}/ai-evaluate")
def ai_evaluate_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="成果不存在")

    topic = db.query(models.Topic).filter(models.Topic.id == submission.topic_id).first()
    project = db.query(models.Project).filter(models.Project.id == topic.project_id).first()

    submission_data = {
        "impressions": submission.impressions,
        "interactions": submission.interactions,
        "actual_cost": submission.actual_cost,
        "comment_self_review": submission.comment_self_review,
    }
    topic_data = {
        "channel": topic.channel,
        "account_type": topic.account_type,
        "account_avg_likes": topic.account_avg_likes,
        "account_avg_comments": topic.account_avg_comments,
        "account_avg_shares": topic.account_avg_shares,
    }
    project_data = {
        "name": project.name,
        "brand_mind_goal": project.brand_mind_goal or "",
        "key_memory_points": project.key_memory_points or [],
    }

    try:
        result = ai_service.evaluate_acceptance(submission_data, topic_data, project_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI验收评估失败：{str(e)}")

    return result


@router.post("/{submission_id}/accept", response_model=schemas.AcceptanceOut)
def create_acceptance(
    submission_id: UUID,
    data: schemas.AcceptanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="成果不存在")
    if submission.acceptance:
        raise HTTPException(status_code=400, detail="已存在验收记录")

    record = models.AcceptanceRecord(
        submission_id=submission_id,
        **data.model_dump(),
        created_by=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{submission_id}/accept", response_model=schemas.AcceptanceOut)
def update_acceptance(
    submission_id: UUID,
    data: schemas.AcceptanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission or not submission.acceptance:
        raise HTTPException(status_code=404, detail="验收记录不存在")

    record = submission.acceptance
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record
