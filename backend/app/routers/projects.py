from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from uuid import UUID
from collections import defaultdict

from ..database import get_db
from ..auth import get_current_user, require_hq
from .. import models, schemas

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return (
        db.query(models.Project)
        .options(joinedload(models.Project.creator))
        .order_by(models.Project.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.ProjectOut)
def create_project(
    data: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    project = models.Project(**data.model_dump(), created_by=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/aggregate-stats")
def get_aggregate_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    projects = (
        db.query(models.Project)
        .options(
            joinedload(models.Project.topics)
            .joinedload(models.Topic.submissions)
            .joinedload(models.Submission.acceptance),
            joinedload(models.Project.topics)
            .joinedload(models.Topic.creator),
        )
        .order_by(models.Project.start_date.asc())
        .all()
    )

    project_rows = []
    region_map = defaultdict(lambda: {
        "total_topics": 0, "total_impressions": 0,
        "cpm_sum": 0.0, "cpm_count": 0,
        "verdict_count": 0, "pass_count": 0,
        "projects": set(),
    })

    for proj in projects:
        p_impressions = 0
        p_cost = 0.0
        p_cpm_sum = 0.0
        p_cpm_count = 0
        p_verdict = 0
        p_pass = 0

        for topic in proj.topics:
            region = (topic.creator.region if topic.creator else None) or "未知"
            region_map[region]["total_topics"] += 1
            region_map[region]["projects"].add(str(proj.id))

            for sub in topic.submissions:
                imp = sub.impressions or 0
                p_impressions += imp
                p_cost += sub.actual_cost or 0
                region_map[region]["total_impressions"] += imp

                if sub.cpm and sub.cpm > 0:
                    p_cpm_sum += sub.cpm
                    p_cpm_count += 1
                    region_map[region]["cpm_sum"] += sub.cpm
                    region_map[region]["cpm_count"] += 1

                if sub.acceptance:
                    p_verdict += 1
                    region_map[region]["verdict_count"] += 1
                    if sub.acceptance.conclusion in ("通过", "部分通过"):
                        p_pass += 1
                        region_map[region]["pass_count"] += 1

        project_rows.append({
            "id": str(proj.id),
            "name": proj.name,
            "product": proj.product,
            "start_date": str(proj.start_date),
            "end_date": str(proj.end_date),
            "status": proj.status,
            "total_impressions": p_impressions,
            "total_cost": p_cost,
            "avg_cpm": p_cpm_sum / p_cpm_count if p_cpm_count > 0 else None,
            "pass_rate": p_pass / p_verdict * 100 if p_verdict > 0 else None,
            "total_submissions": p_verdict + (
                sum(1 for t in proj.topics for s in t.submissions if not s.acceptance)
            ),
        })

    region_rows = [
        {
            "region": region,
            "project_count": len(d["projects"]),
            "total_topics": d["total_topics"],
            "total_impressions": d["total_impressions"],
            "avg_cpm": d["cpm_sum"] / d["cpm_count"] if d["cpm_count"] > 0 else None,
            "pass_rate": d["pass_count"] / d["verdict_count"] * 100 if d["verdict_count"] > 0 else None,
        }
        for region, d in sorted(region_map.items())
    ]

    return {"project_rows": project_rows, "region_rows": region_rows}
def get_project(project_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    project = (
        db.query(models.Project)
        .options(joinedload(models.Project.creator))
        .filter(models.Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


@router.patch("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: UUID,
    data: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}/stats", response_model=schemas.ProjectStats)
def get_project_stats(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    topics = db.query(models.Topic).filter(models.Topic.project_id == project_id).all()
    total_topics = len(topics)
    published_topics = sum(1 for t in topics if t.status in ("已完成", "执行中"))
    accepted_topics = 0
    total_impressions = 0
    total_cost = 0.0
    total_cpm_weighted = 0.0
    cpm_count = 0

    for topic in topics:
        for sub in topic.submissions:
            if sub.acceptance and sub.acceptance.conclusion == "通过":
                accepted_topics += 1
            total_impressions += sub.impressions or 0
            total_cost += sub.actual_cost or 0
            if sub.cpm and sub.cpm > 0:
                total_cpm_weighted += sub.cpm
                cpm_count += 1

    avg_cpm = total_cpm_weighted / cpm_count if cpm_count > 0 else None

    # City-level breakdown
    city_map = defaultdict(lambda: {"topics": 0, "published": 0, "accepted": 0})
    for topic in topics:
        creator = db.query(models.User).filter(models.User.id == topic.created_by).first()
        city = (creator.region if creator else None) or "未知"
        city_map[city]["topics"] += 1
        if topic.status in ("已完成", "执行中"):
            city_map[city]["published"] += 1
        for sub in topic.submissions:
            if sub.acceptance and sub.acceptance.conclusion == "通过":
                city_map[city]["accepted"] += 1

    city_stats = [{"city": k, **v} for k, v in city_map.items()]

    return schemas.ProjectStats(
        total_topics=total_topics,
        published_topics=published_topics,
        accepted_topics=accepted_topics,
        total_impressions=total_impressions,
        total_cost=total_cost,
        avg_cpm=avg_cpm,
        city_stats=city_stats,
    )


@router.get("/{project_id}/retrospective")
def get_project_retrospective(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    topics = (
        db.query(models.Topic)
        .options(
            joinedload(models.Topic.submissions).joinedload(models.Submission.acceptance),
            joinedload(models.Topic.creator),
        )
        .filter(models.Topic.project_id == project_id)
        .all()
    )

    all_subs = []
    total_impressions = 0
    total_cost = 0.0
    cpm_sum = 0.0
    cpm_count = 0
    accepted_count = 0
    partial_count = 0
    fail_count = 0
    no_verdict_count = 0
    channel_map = defaultdict(lambda: {"submissions": 0, "impressions": 0, "cpm_sum": 0.0, "cpm_count": 0, "pass_count": 0})

    for topic in topics:
        region = (topic.creator.region if topic.creator else None) or "未知"
        for sub in topic.submissions:
            total_impressions += sub.impressions or 0
            total_cost += sub.actual_cost or 0
            if sub.cpm and sub.cpm > 0:
                cpm_sum += sub.cpm
                cpm_count += 1

            conclusion = approved_amount = ai_eval = None
            if sub.acceptance:
                conclusion = sub.acceptance.conclusion
                approved_amount = sub.acceptance.approved_amount
                ai_eval = sub.acceptance.ai_evaluation_result
                if conclusion == "通过":
                    accepted_count += 1
                elif conclusion == "部分通过":
                    partial_count += 1
                else:
                    fail_count += 1
            else:
                no_verdict_count += 1

            ch = topic.channel
            channel_map[ch]["submissions"] += 1
            channel_map[ch]["impressions"] += sub.impressions or 0
            if sub.cpm and sub.cpm > 0:
                channel_map[ch]["cpm_sum"] += sub.cpm
                channel_map[ch]["cpm_count"] += 1
            if conclusion in ("通过", "部分通过"):
                channel_map[ch]["pass_count"] += 1

            all_subs.append({
                "id": str(sub.id),
                "account_name": sub.account_name,
                "account_type": sub.account_type,
                "channel": topic.channel,
                "impressions": sub.impressions or 0,
                "interactions": sub.interactions or 0,
                "cpm": sub.cpm,
                "cpm_status": sub.cpm_status,
                "content_link": sub.content_link,
                "comment_self_review": sub.comment_self_review,
                "has_organic_coverage": sub.has_organic_coverage or False,
                "organic_coverage_note": sub.organic_coverage_note,
                "region": region,
                "conclusion": conclusion,
                "approved_amount": approved_amount,
                "ai_eval": ai_eval,
            })

    avg_cpm = cpm_sum / cpm_count if cpm_count > 0 else None
    total_with_verdict = accepted_count + partial_count + fail_count
    pass_rate = (accepted_count + partial_count) / total_with_verdict * 100 if total_with_verdict > 0 else None

    channel_breakdown = [
        {
            "channel": ch,
            "submissions": d["submissions"],
            "impressions": d["impressions"],
            "avg_cpm": d["cpm_sum"] / d["cpm_count"] if d["cpm_count"] > 0 else None,
            "pass_count": d["pass_count"],
        }
        for ch, d in channel_map.items()
    ]

    all_subs.sort(key=lambda x: x["impressions"], reverse=True)

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "product": project.product,
            "key_memory_points": project.key_memory_points or [],
            "brand_mind_goal": project.brand_mind_goal,
            "budget": project.budget,
        },
        "overview": {
            "total_impressions": total_impressions,
            "total_cost": total_cost,
            "avg_cpm": avg_cpm,
            "total_submissions": len(all_subs),
            "accepted_count": accepted_count,
            "partial_count": partial_count,
            "fail_count": fail_count,
            "no_verdict_count": no_verdict_count,
            "pass_rate": pass_rate,
        },
        "channel_breakdown": channel_breakdown,
        "submissions": all_subs,
    }
