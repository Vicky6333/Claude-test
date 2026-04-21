from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..auth import get_current_user
from .. import models, schemas
from ..services import ai_service

router = APIRouter(prefix="/api/topics", tags=["topics"])


def _project_dict(project: models.Project) -> dict:
    return {
        "name": project.name,
        "product": project.product,
        "main_narrative": project.main_narrative or "",
        "key_memory_points": project.key_memory_points or [],
        "brand_mind_goal": project.brand_mind_goal or "",
        "hq_content_summary": project.hq_content_summary or "",
    }


def _topic_dict(topic: models.Topic) -> dict:
    return {
        "channel": topic.channel,
        "account_type": topic.account_type,
        "direction": topic.direction,
        "account_avg_likes": topic.account_avg_likes,
        "account_avg_comments": topic.account_avg_comments,
        "account_avg_shares": topic.account_avg_shares,
        "estimated_cost": topic.estimated_cost,
        "platform_content_info": topic.platform_content_info,
    }


@router.get("", response_model=List[schemas.TopicOut])
def list_topics(
    project_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = (
        db.query(models.Topic)
        .options(
            joinedload(models.Topic.evaluations),
            joinedload(models.Topic.creator),
        )
    )
    if project_id:
        query = query.filter(models.Topic.project_id == project_id)
    if status:
        query = query.filter(models.Topic.status == status)
    if current_user.role == "region":
        query = query.filter(models.Topic.created_by == current_user.id)
    return query.order_by(models.Topic.created_at.desc()).all()


@router.post("", response_model=schemas.TopicOut)
def create_topic(
    data: schemas.TopicCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    topic = models.Topic(**data.model_dump(), created_by=current_user.id)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/{topic_id}", response_model=schemas.TopicOut)
def get_topic(topic_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    topic = (
        db.query(models.Topic)
        .options(
            joinedload(models.Topic.evaluations),
            joinedload(models.Topic.creator),
            joinedload(models.Topic.submissions).joinedload(models.Submission.acceptance),
        )
        .filter(models.Topic.id == topic_id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="选题不存在")
    return topic


@router.patch("/{topic_id}", response_model=schemas.TopicOut)
def update_topic(
    topic_id: UUID,
    data: schemas.TopicUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="选题不存在")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(topic, field, value)
    db.commit()
    db.refresh(topic)
    return topic


@router.post("/{topic_id}/evaluate", response_model=schemas.AIEvaluationOut)
def evaluate_topic(
    topic_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="选题不存在")

    project = db.query(models.Project).filter(models.Project.id == topic.project_id).first()

    try:
        result = ai_service.evaluate_topic(_project_dict(project), _topic_dict(topic))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI评估失败：{str(e)}")

    parsed = result["parsed"]
    roi = parsed.get("roi", {})

    evaluation = models.AIEvaluation(
        topic_id=topic_id,
        alignment_score=parsed.get("alignment", {}).get("score"),
        alignment_note=parsed.get("alignment", {}).get("note"),
        differentiation=parsed.get("differentiation"),
        platform_environment=parsed.get("platform_environment"),
        account_match=parsed.get("account_match"),
        cpm_prediction_min=roi.get("cpm_min"),
        cpm_prediction_max=roi.get("cpm_max"),
        min_exposure_for_pass=roi.get("min_exposure"),
        roi_note=roi.get("note"),
        risk_note=parsed.get("risks"),
        suggestions=parsed.get("suggestions", []),
        raw_response=result["raw"],
    )
    db.add(evaluation)

    topic.status = "已评估"
    db.commit()
    db.refresh(evaluation)
    return evaluation
