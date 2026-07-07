from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path
import uuid

from ..database import get_db
from ..models import TranslationTask, User
from ..services.translation_service import translation_service
from ..auth import get_current_user
from ..schemas import TranslationTaskSchema

router = APIRouter(prefix="/api/translations", tags=["translations"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传要翻译的文件"""
    try:
        # 验证文件类型
        allowed_extensions = {".epub", ".fb2", ".txt"}
        file_ext = Path(file.filename).suffix.lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的文件类型。支持: {', '.join(allowed_extensions)}"
            )

        # 保存文件
        upload_dir = translation_service.UPLOAD_DIR
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_id = str(uuid.uuid4())
        file_path = upload_dir / f"{file_id}_{file.filename}"

        # 读取文件内容并保存
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        file_size = len(contents)

        # 创建翻译任务
        task = await translation_service.create_task(
            user_id=current_user.id,
            file_path=str(file_path),
            original_filename=file.filename,
            file_size=file_size,
            db=db
        )

        return {
            "task_id": str(task.id),
            "filename": task.original_filename,
            "file_size": task.file_size,
            "status": task.status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{task_id}/start")
async def start_translation(
    task_id: str,
    deepseek_api_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """启动翻译任务"""
    task = db.query(TranslationTask).filter(
        TranslationTask.id == task_id,
        TranslationTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    if task.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"任务状态为 {task.status}，无法启动"
        )

    success = await translation_service.start_translation(task_id, deepseek_api_key, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="启动翻译失败"
        )

    return {
        "message": "翻译任务已启动",
        "task_id": task_id,
        "status": "processing"
    }


@router.get("/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取翻译任务状态"""
    task = db.query(TranslationTask).filter(
        TranslationTask.id == task_id,
        TranslationTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    return {
        "task_id": str(task.id),
        "filename": task.original_filename,
        "status": task.status,
        "progress": task.progress,
        "current_step": task.current_step,
        "started_at": task.started_at,
        "completed_at": task.completed_at,
        "error_message": task.error_message,
        "file_size": task.file_size,
        "source_language": task.source_language
    }


@router.post("/{task_id}/stop")
async def stop_translation(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """停止翻译任务"""
    task = db.query(TranslationTask).filter(
        TranslationTask.id == task_id,
        TranslationTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    success = await translation_service.stop_task(task_id, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法停止任务，任务可能已完成或失败"
        )

    return {
        "message": "翻译任务已停止",
        "task_id": task_id,
        "status": "stopped"
    }


@router.get("")
async def get_user_translations(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的翻译任务列表"""
    tasks, total = await translation_service.get_user_tasks(
        user_id=current_user.id,
        db=db,
        limit=limit,
        offset=skip
    )

    return {
        "tasks": [
            {
                "task_id": str(task.id),
                "filename": task.original_filename,
                "status": task.status,
                "progress": task.progress,
                "created_at": task.created_at,
                "completed_at": task.completed_at
            }
            for task in tasks
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{task_id}/download")
async def download_translation(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """下载翻译后的文件"""
    from fastapi.responses import FileResponse

    task = db.query(TranslationTask).filter(
        TranslationTask.id == task_id,
        TranslationTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    if task.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"任务状态为 {task.status}，无法下载"
        )

    if not task.translated_file_path or not os.path.exists(task.translated_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="翻译文件不存在"
        )

    return FileResponse(
        path=task.translated_file_path,
        filename=f"translated_{task.original_filename}"
    )


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除翻译任务"""
    success = await translation_service.delete_task(task_id, current_user.id, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    return {"message": "任务已删除"}
