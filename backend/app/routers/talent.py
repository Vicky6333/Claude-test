from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from ..database import get_db
from .. import models, schemas
from ..services import ai_service

# 免登录公开接口：不依赖 get_current_user
router = APIRouter(prefix="/api/talent", tags=["talent"])


@router.post("/reports", response_model=schemas.TalentReportOut)
def create_report(data: schemas.TalentReportCreate, db: Session = Depends(get_db)):
    skills = [s.strip() for s in data.childhood_skills if s and s.strip()]
    if not skills:
        raise HTTPException(status_code=400, detail="请至少填写一件你小时候最擅长的事")

    inputs = {
        "nickname": data.nickname,
        "childhood_skills": skills,
        "reflections": data.reflections.model_dump() if data.reflections else {},
    }

    analysis = ai_service.analyze_talent(inputs)

    report = models.TalentReport(
        nickname=data.nickname,
        inputs=inputs,
        result=analysis["result"],
        raw=analysis["raw"],
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports/{report_id}", response_model=schemas.TalentReportOut)
def get_report(report_id: UUID, db: Session = Depends(get_db)):
    report = db.query(models.TalentReport).filter(models.TalentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在或已过期")
    return report
