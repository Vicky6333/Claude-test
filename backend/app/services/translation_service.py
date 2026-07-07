import os
import shutil
import json
import uuid
import subprocess
import re
from pathlib import Path
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
import threading
import signal

from ..models import TranslationTask, User
from ..database import SessionLocal


class TranslationService:
    UPLOAD_DIR = Path("/tmp/translation_uploads")
    OUTPUT_DIR = Path("/tmp/translation_outputs")

    def __init__(self):
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        self.active_processes = {}  # 存储正在运行的进程

    async def create_task(
        self,
        user_id: str,
        file_path: str,
        original_filename: str,
        file_size: int,
        db: Session
    ) -> TranslationTask:
        """创建翻译任务"""
        task = TranslationTask(
            user_id=user_id,
            original_filename=original_filename,
            original_file_path=file_path,
            file_size=file_size,
            status="pending",
            progress=0
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    async def start_translation(
        self,
        task_id: str,
        deepseek_api_key: str,
        db: Session
    ) -> bool:
        """启动翻译任务"""
        task = db.query(TranslationTask).filter(TranslationTask.id == task_id).first()
        if not task:
            return False

        task.status = "processing"
        task.started_at = datetime.utcnow()
        task.current_step = "初始化"
        db.commit()

        # 在后台线程中运行翻译
        thread = threading.Thread(
            target=self._run_translation,
            args=(task_id, deepseek_api_key),
            daemon=True
        )
        thread.start()
        self.active_processes[str(task_id)] = {"thread": thread, "process": None}

        return True

    def _run_translation(self, task_id: str, deepseek_api_key: str):
        """后台运行翻译"""
        db = SessionLocal()
        try:
            task = db.query(TranslationTask).filter(TranslationTask.id == task_id).first()
            if not task:
                return

            # 配置环境变量
            env = os.environ.copy()
            env["DEEPSEEK_API_KEY"] = deepseek_api_key

            # 创建输出目录
            task_output_dir = self.OUTPUT_DIR / str(task_id)
            task_output_dir.mkdir(parents=True, exist_ok=True)

            # 获取config文件路径
            config_path = Path(__file__).parent.parent / "translation_config.yaml"

            # 构建命令
            cmd = [
                "python", "-m", "trans_novel.cli",
                "translate",
                task.original_file_path,
                "--config", str(config_path),
                "--output", str(task_output_dir)
            ]

            # 启动进程
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env
            )

            self.active_processes[str(task_id)]["process"] = process

            # 监听输出
            for line in process.stdout:
                if task.status == "stopped":
                    process.terminate()
                    break

                line = line.strip()
                if line:
                    # 解析进度信息
                    self._parse_progress(task, line, db)

            # 等待进程完成
            returncode = process.wait()

            if task.status != "stopped":
                if returncode == 0:
                    # 找到翻译后的文件
                    translated_file = self._find_translated_file(task_output_dir)

                    if translated_file:
                        task.translated_file_path = str(translated_file)
                        task.status = "completed"
                        task.progress = 100
                        task.completed_at = datetime.utcnow()
                    else:
                        task.status = "failed"
                        task.error_message = "翻译完成但找不到输出文件"
                else:
                    task.status = "failed"
                    stderr_output = process.stderr.read() if process.stderr else ""
                    task.error_message = f"翻译进程失败: {stderr_output[:500]}"

            db.commit()

        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            db.commit()
        finally:
            db.close()
            if str(task_id) in self.active_processes:
                del self.active_processes[str(task_id)]

    def _parse_progress(self, task: TranslationTask, line: str, db: Session):
        """解析进度信息"""
        # 这里可以根据wenyi的输出格式来解析进度
        # 例如：
        # "Chapter 1: Translating..." -> 更新current_step
        # "Progress: 50%" -> 更新progress

        if "Chapter" in line:
            task.current_step = line
            db.commit()
        elif "Progress" in line or "%" in line:
            try:
                match = re.search(r"(\d+)%", line)
                if match:
                    progress = int(match.group(1))
                    if progress != task.progress:
                        task.progress = progress
                        db.commit()
            except:
                pass

    def _find_translated_file(self, directory: Path) -> Optional[Path]:
        """查找翻译后的文件"""
        # 查找最新的EPUB文件
        epub_files = list(directory.glob("**/*.epub"))
        if epub_files:
            return max(epub_files, key=lambda p: p.stat().st_mtime)

        # 如果没有EPUB，查找其他格式
        txt_files = list(directory.glob("**/*.txt"))
        if txt_files:
            return max(txt_files, key=lambda p: p.stat().st_mtime)

        return None

    async def get_task_status(self, task_id: str, db: Session) -> Optional[TranslationTask]:
        """获取任务状态"""
        return db.query(TranslationTask).filter(TranslationTask.id == task_id).first()

    async def stop_task(self, task_id: str, db: Session) -> bool:
        """停止翻译任务"""
        task = db.query(TranslationTask).filter(TranslationTask.id == task_id).first()
        if not task:
            return False

        if task.status == "processing":
            task.status = "stopped"
            db.commit()

            # 停止进程
            if str(task_id) in self.active_processes:
                process = self.active_processes[str(task_id)].get("process")
                if process and process.poll() is None:
                    process.terminate()

            return True

        return False

    async def get_user_tasks(self, user_id: str, db: Session, limit: int = 50, offset: int = 0):
        """获取用户的翻译任务列表"""
        tasks = db.query(TranslationTask).filter(
            TranslationTask.user_id == user_id
        ).order_by(
            TranslationTask.created_at.desc()
        ).offset(offset).limit(limit).all()

        total = db.query(TranslationTask).filter(
            TranslationTask.user_id == user_id
        ).count()

        return tasks, total

    async def delete_task(self, task_id: str, user_id: str, db: Session) -> bool:
        """删除翻译任务"""
        task = db.query(TranslationTask).filter(
            TranslationTask.id == task_id,
            TranslationTask.user_id == user_id
        ).first()

        if not task:
            return False

        # 删除文件
        if task.original_file_path and os.path.exists(task.original_file_path):
            os.remove(task.original_file_path)

        if task.translated_file_path and os.path.exists(task.translated_file_path):
            os.remove(task.translated_file_path)

        # 删除任务目录
        task_dir = self.OUTPUT_DIR / str(task_id)
        if task_dir.exists():
            shutil.rmtree(task_dir)

        db.delete(task)
        db.commit()
        return True


translation_service = TranslationService()
