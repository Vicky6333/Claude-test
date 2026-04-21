from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, SessionLocal, Base
from . import models
from .auth import get_password_hash
from .routers import auth, projects, materials, topics, submissions

Base.metadata.create_all(bind=engine)

app = FastAPI(title="零售商品传播协同平台", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(materials.router)
app.include_router(topics.router)
app.include_router(submissions.router)


def seed_demo_users():
    db: Session = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            return
        demo_users = [
            models.User(
                username="admin",
                email="admin@retail.com",
                hashed_password=get_password_hash("admin123"),
                role="headquarters",
                display_name="总部传播负责人",
            ),
            models.User(
                username="region_bj",
                email="bj@retail.com",
                hashed_password=get_password_hash("region123"),
                role="region",
                region="北京",
                display_name="北京区域BP",
            ),
            models.User(
                username="region_sh",
                email="sh@retail.com",
                hashed_password=get_password_hash("region123"),
                role="region",
                region="上海",
                display_name="上海区域BP",
            ),
            models.User(
                username="region_gz",
                email="gz@retail.com",
                hashed_password=get_password_hash("region123"),
                role="region",
                region="广州",
                display_name="广州区域BP",
            ),
        ]
        db.add_all(demo_users)
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def startup():
    seed_demo_users()


@app.get("/health")
def health():
    return {"status": "ok"}
