from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..auth import get_current_user, require_hq
from .. import models, schemas

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("", response_model=List[schemas.MaterialOut])
def list_materials(
    project_id: Optional[UUID] = None,
    type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.Material)
    if project_id:
        query = query.filter(models.Material.project_id == project_id)
    if type:
        query = query.filter(models.Material.type == type)
    if q:
        query = query.filter(
            models.Material.name.ilike(f"%{q}%") | models.Material.description.ilike(f"%{q}%")
        )
    return query.order_by(models.Material.created_at.desc()).all()


@router.post("", response_model=schemas.MaterialOut)
def create_material(
    data: schemas.MaterialCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    material = models.Material(**data.model_dump(), created_by=current_user.id)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/{material_id}", response_model=schemas.MaterialOut)
def get_material(material_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    return material


@router.patch("/{material_id}", response_model=schemas.MaterialOut)
def update_material(
    material_id: UUID,
    data: schemas.MaterialUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/{material_id}")
def delete_material(
    material_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_hq),
):
    material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    db.delete(material)
    db.commit()
    return {"ok": True}
