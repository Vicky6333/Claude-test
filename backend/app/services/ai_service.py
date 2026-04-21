import json
import os
import re
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
)

MODEL = "deepseek-chat"

CPM_STANDARDS = {
    "小红书": {"cpm_limit": 40, "interaction_min": 1000},
    "视频号": {"cpm_limit": 60, "interaction_min": 1000},
    "微信图文": {"cpm_limit": 50, "interaction_min": 500},
    "本地媒体": {"cpm_limit": None, "interaction_min": 1000},
}

SYSTEM_PROMPT = """你是一位零售商品传播领域的专业顾问，擅长评估区域传播选题的质量和ROI。
你的任务是基于总部传播主线，对区域提交的选题进行全面评估。
输出必须是标准JSON格式，不包含任何额外文字或markdown代码块。"""


def _call(system: str, user: str, max_tokens: int = 2000) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw


def build_evaluation_prompt(project_data: dict, topic_data: dict) -> str:
    channel = topic_data.get("channel", "")
    standard = CPM_STANDARDS.get(channel, {"cpm_limit": 50, "interaction_min": 1000})
    cpm_limit = standard["cpm_limit"] or "无硬性CPM要求"
    interaction_min = standard["interaction_min"]

    avg_interactions = (
        topic_data.get("account_avg_likes", 0)
        + topic_data.get("account_avg_comments", 0)
        + topic_data.get("account_avg_shares", 0)
    )
    estimated_cost = topic_data.get("estimated_cost", 0)
    platform_info = topic_data.get("platform_content_info", "")
    platform_section = f"- 平台同类内容情况：{platform_info}" if platform_info else "- 平台同类内容情况：（区域未填写）"

    return f"""[项目基本信息]
- 项目名称：{project_data.get("name", "")}
- 商品/品类：{project_data.get("product", "")}
- 传播主线：{project_data.get("main_narrative", "（未填写）")}
- 核心记忆点：{", ".join(project_data.get("key_memory_points", []))}
- 品牌心智目标：{project_data.get("brand_mind_goal", "（未填写）")}
- 总部已发内容摘要：{project_data.get("hq_content_summary", "（未填写）")}

[验收标准]
- {channel}：CPM ≤ {cpm_limit} 且互动量 ≥ {interaction_min}
- 区域媒体官方账号：互动量 ≥ 1000 或评论有品牌相关互动

[区域提交信息]
- 选题方向：{topic_data.get("direction", "")}
- 目标渠道：{channel}
- 账号类型：{topic_data.get("account_type", "")}
- 账号历史均值：点赞 {topic_data.get("account_avg_likes", 0)}，评论 {topic_data.get("account_avg_comments", 0)}，转发 {topic_data.get("account_avg_shares", 0)}（合计 {avg_interactions}）
- 预估花费：{estimated_cost} 元
{platform_section}

[评估任务]
请对该选题进行评估，输出如下JSON结构（所有字段必须填写，字符串用双引号，数字不加引号）：

{{
  "alignment": {{
    "score": "高|中|低",
    "note": "对齐度说明，指出是否覆盖核心记忆点、是否呼应品牌心智目标"
  }},
  "differentiation": "与总部已发内容的差异化分析，区域特色加分点，与种草内容的定位区分",
  "platform_environment": "选题方向在目标平台的内容环境：竞争密度（高/中/低）、用户接受度判断",
  "account_match": "所选账号类型与选题方向的匹配度分析，以及号段选取建议",
  "roi": {{
    "cpm_min": 预测CPM下限数字,
    "cpm_max": 预测CPM上限数字,
    "min_exposure": 达标所需最低曝光量数字,
    "note": "ROI预测说明，是否预计达标"
  }},
  "risks": "风险提示：内容是否存在过于硬广、平台降权风险、负面发酵隐患",
  "suggestions": ["具体可操作建议1", "具体可操作建议2", "具体可操作建议3"]
}}"""


def evaluate_topic(project_data: dict, topic_data: dict) -> dict:
    prompt = build_evaluation_prompt(project_data, topic_data)
    raw_text = _call(SYSTEM_PROMPT, prompt, max_tokens=2000)

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        result = {
            "alignment": {"score": "中", "note": "AI解析失败，请重试"},
            "differentiation": raw_text[:500],
            "platform_environment": "",
            "account_match": "",
            "roi": {"cpm_min": 0, "cpm_max": 0, "min_exposure": 0, "note": ""},
            "risks": "",
            "suggestions": [],
        }

    return {"raw": raw_text, "parsed": result}


def evaluate_acceptance(submission_data: dict, topic_data: dict, project_data: dict) -> dict:
    channel = topic_data.get("channel", "")
    impressions = submission_data.get("impressions", 0)
    interactions = submission_data.get("interactions", 0)
    actual_cost = submission_data.get("actual_cost", 0)
    cpm = (actual_cost / impressions * 1000) if impressions > 0 else 0
    standard = CPM_STANDARDS.get(channel, {"cpm_limit": 50, "interaction_min": 1000})

    prompt = f"""[验收评估任务]
项目：{project_data.get("name", "")}
品牌心智目标：{project_data.get("brand_mind_goal", "")}
核心记忆点：{", ".join(project_data.get("key_memory_points", []))}

传播数据：
- 渠道：{channel}
- 账号类型：{topic_data.get("account_type", "")}
- 曝光量：{impressions:,}
- 互动量：{interactions:,}
- 实际花费：{actual_cost} 元
- CPM：{cpm:.1f}
- 账号历史均值（互动）：{topic_data.get("account_avg_likes", 0) + topic_data.get("account_avg_comments", 0) + topic_data.get("account_avg_shares", 0)}

验收标准：CPM ≤ {standard.get("cpm_limit", "N/A")}，互动量 ≥ {standard.get("interaction_min", 1000)}
评论区自评：{submission_data.get("comment_self_review", "（未填写）")}

请输出JSON：
{{
  "mind_penetration": "心智渗透评估：评论区是否可能出现目标心智词，品牌相关内容占比估算",
  "performance_vs_baseline": "与账号历史均值对比：本次表现高于/低于均值多少",
  "overall_grade": "A|B|C|D",
  "grade_reason": "评级理由（A=量化达标+心智渗透良好，B=量化达标心智渗透弱，C=量化未达标但有亮点，D=量化未达标内容偏离主线）",
  "suggestions": ["针对该区域下次传播的具体改进建议1", "建议2"]
}}"""

    raw_text = _call(SYSTEM_PROMPT, prompt, max_tokens=1200)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"mind_penetration": raw_text[:300], "overall_grade": "C", "grade_reason": "解析失败", "suggestions": []}
