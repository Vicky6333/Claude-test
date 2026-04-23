import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, Boolean,
    Text, JSON, Date, ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # headquarters / region
    region = Column(String(100))
    display_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="creator")
    topics = relationship("Topic", back_populates="creator")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    product = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    cities = Column(JSON, default=list)
    main_narrative = Column(Text)
    key_memory_points = Column(JSON, default=list)
    brand_mind_goal = Column(Text)
    hq_content_summary = Column(Text)
    budget = Column(Float, default=0)
    status = Column(String(20), default="active")  # active / completed / draft
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="projects")
    materials = relationship("Material", back_populates="project", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="project", cascade="all, delete-orphan")


class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(String(500))
    channels = Column(JSON, default=list)
    link = Column(Text, nullable=False)
    usage_note = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="materials")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    channel = Column(String(50), nullable=False)
    account_type = Column(String(50), nullable=False)
    direction = Column(Text, nullable=False)
    account_avg_likes = Column(Integer, default=0)
    account_avg_comments = Column(Integer, default=0)
    account_avg_shares = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0)
    material_ids = Column(JSON, default=list)
    platform_content_info = Column(Text)
    status = Column(String(20), default="草稿")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="topics")
    creator = relationship("User", back_populates="topics")
    evaluations = relationship("AIEvaluation", back_populates="topic", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="topic", cascade="all, delete-orphan")


class AIEvaluation(Base):
    __tablename__ = "ai_evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False)
    alignment_score = Column(String(10))
    alignment_note = Column(Text)
    differentiation = Column(Text)
    platform_environment = Column(Text)
    account_match = Column(Text)
    cpm_prediction_min = Column(Float)
    cpm_prediction_max = Column(Float)
    min_exposure_for_pass = Column(Integer)
    roi_note = Column(Text)
    risk_note = Column(Text)
    suggestions = Column(JSON, default=list)
    raw_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    topic = relationship("Topic", back_populates="evaluations")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False)
    content_link = Column(Text, nullable=False)
    account_name = Column(String(200))
    account_type = Column(String(50))
    impressions = Column(Integer, default=0)
    interactions = Column(Integer, default=0)
    actual_cost = Column(Float, default=0)
    comment_self_review = Column(Text)
    has_organic_coverage = Column(Boolean, default=False)
    organic_coverage_note = Column(Text)
    cpm = Column(Float)
    cpm_status = Column(String(20), default="pending")  # pass / warn / fail / pending
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    topic = relationship("Topic", back_populates="submissions")
    acceptance = relationship("AcceptanceRecord", back_populates="submission", uselist=False)


class AcceptanceRecord(Base):
    __tablename__ = "acceptance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False, unique=True)
    conclusion = Column(String(20))  # 通过 / 部分通过 / 不通过
    approved_impressions = Column(Integer)
    approved_amount = Column(Float)
    notes = Column(Text)
    ai_evaluation_result = Column(JSON)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("Submission", back_populates="acceptance")
