from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime, date
from uuid import UUID


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: UUID
    username: str
    email: str
    role: str
    region: Optional[str]
    display_name: Optional[str]
    responsible_person: Optional[str] = None

    class Config:
        from_attributes = True

class UserPatch(BaseModel):
    responsible_person: Optional[str] = None


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    product: str
    start_date: date
    end_date: date
    cities: List[str] = []
    main_narrative: Optional[str] = None
    key_memory_points: List[str] = []
    brand_mind_goal: Optional[str] = None
    hq_content_summary: Optional[str] = None
    budget: float = 0
    status: str = "active"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    product: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cities: Optional[List[str]] = None
    main_narrative: Optional[str] = None
    key_memory_points: Optional[List[str]] = None
    brand_mind_goal: Optional[str] = None
    hq_content_summary: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[str] = None

class ProjectOut(BaseModel):
    id: UUID
    name: str
    product: str
    start_date: date
    end_date: date
    cities: List[str]
    main_narrative: Optional[str]
    key_memory_points: List[str]
    brand_mind_goal: Optional[str]
    hq_content_summary: Optional[str]
    budget: float
    status: str
    created_by: UUID
    created_at: datetime
    creator: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── Material ──────────────────────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    project_id: UUID
    type: str
    name: str
    description: Optional[str] = None
    channels: List[str] = []
    link: str
    usage_note: Optional[str] = None

class MaterialUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    channels: Optional[List[str]] = None
    link: Optional[str] = None
    usage_note: Optional[str] = None

class MaterialOut(BaseModel):
    id: UUID
    project_id: UUID
    type: str
    name: str
    description: Optional[str]
    channels: List[str]
    link: str
    usage_note: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Topic ─────────────────────────────────────────────────────────────────────

class TopicCreate(BaseModel):
    project_id: UUID
    channel: str
    account_type: str
    direction: str
    account_avg_likes: int = 0
    account_avg_comments: int = 0
    account_avg_shares: int = 0
    estimated_cost: float = 0
    material_ids: List[str] = []
    platform_content_info: Optional[str] = None

class TopicUpdate(BaseModel):
    channel: Optional[str] = None
    account_type: Optional[str] = None
    direction: Optional[str] = None
    account_avg_likes: Optional[int] = None
    account_avg_comments: Optional[int] = None
    account_avg_shares: Optional[int] = None
    estimated_cost: Optional[float] = None
    material_ids: Optional[List[str]] = None
    platform_content_info: Optional[str] = None
    status: Optional[str] = None

class AIEvaluationOut(BaseModel):
    id: UUID
    topic_id: UUID
    alignment_score: Optional[str]
    alignment_note: Optional[str]
    differentiation: Optional[str]
    platform_environment: Optional[str]
    account_match: Optional[str]
    cpm_prediction_min: Optional[float]
    cpm_prediction_max: Optional[float]
    min_exposure_for_pass: Optional[int]
    roi_note: Optional[str]
    risk_note: Optional[str]
    suggestions: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TopicOut(BaseModel):
    id: UUID
    project_id: UUID
    channel: str
    account_type: str
    direction: str
    account_avg_likes: int
    account_avg_comments: int
    account_avg_shares: int
    estimated_cost: float
    material_ids: List[str]
    platform_content_info: Optional[str]
    status: str
    created_by: Optional[UUID]
    created_at: datetime
    evaluations: List[AIEvaluationOut] = []
    creator: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── Submission ────────────────────────────────────────────────────────────────

class SubmissionCreate(BaseModel):
    topic_id: UUID
    content_link: str
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    impressions: int = 0
    interactions: int = 0
    actual_cost: float = 0
    comment_self_review: Optional[str] = None
    comment_screenshot_urls: List[str] = []

class SubmissionPatch(BaseModel):
    has_organic_coverage: Optional[bool] = None
    organic_coverage_note: Optional[str] = None
    comment_screenshot_urls: Optional[List[str]] = None

class AcceptanceCreate(BaseModel):
    conclusion: str
    approved_impressions: Optional[int] = None
    approved_amount: Optional[float] = None
    notes: Optional[str] = None
    ai_evaluation_result: Optional[Any] = None

class AcceptanceOut(BaseModel):
    id: UUID
    submission_id: UUID
    conclusion: str
    approved_impressions: Optional[int]
    approved_amount: Optional[float]
    notes: Optional[str]
    ai_evaluation_result: Optional[Any]
    created_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    id: UUID
    topic_id: UUID
    content_link: str
    account_name: Optional[str]
    account_type: Optional[str]
    impressions: int
    interactions: int
    actual_cost: float
    comment_self_review: Optional[str]
    comment_screenshot_urls: List[str] = []
    has_organic_coverage: bool = False
    organic_coverage_note: Optional[str] = None
    cpm: Optional[float]
    cpm_status: str
    created_by: Optional[UUID]
    created_at: datetime
    acceptance: Optional[AcceptanceOut] = None

    class Config:
        from_attributes = True


# ── Talent Detector（天赋探测仪，免登录）────────────────────────────────────────

class TalentReflections(BaseModel):
    flow: Optional[str] = None          # 做什么会忘记时间
    asked_for: Optional[str] = None     # 别人常找你帮的忙
    proud_moment: Optional[str] = None  # 最有成就感的高光时刻

class TalentReportCreate(BaseModel):
    nickname: Optional[str] = None
    childhood_skills: List[str] = []
    reflections: Optional[TalentReflections] = None

class TalentReportOut(BaseModel):
    id: UUID
    nickname: Optional[str]
    inputs: Any
    result: Any
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard Stats ───────────────────────────────────────────────────────────

class ProjectStats(BaseModel):
    total_topics: int
    published_topics: int
    accepted_topics: int
    total_impressions: int
    total_cost: float
    avg_cpm: Optional[float]
    city_stats: List[dict]
