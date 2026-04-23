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
输出必须是标准JSON格式，不包含任何额外文字或markdown代码块。

【评估原则】
这是品牌传播，不是电商种草。品牌传播的目标是建立心智认知（如"社区冰箱"），而非直接转化。
评估时请区分两种内容定位的不同逻辑，避免用种草ROI标准评判品牌传播内容。

【账号类型与选题匹配规则】
- KOC / 素人感账号：适合"真实体验""生活场景""踩坑经历"类内容；植入感强的内容在此类账号风险高，易被平台降权。
- KOL（粉丝量大）：适合"对比测评""功效种草""话题辟谣""知识科普"类内容；需注意平台广告判定风险。
- 区域媒体官方账号：适合"供应链溯源""产地故事""事件角度""反向供给"类内容；公信力强，但内容需有新闻价值。

【差异化判断要点】
- 首先判断选题是否与总部已发内容重复或高度相似
- 识别区域特色加分点：地域视角、本地消费者画像、本地媒体背书
- 区分"换一个角度说同一件事"（可以，有价值）vs"完全重复"（不建议）

【ROI预测方法】
- 预测CPM = 预估花费 ÷ 预估曝光量 × 1000
- 预估曝光量参考账号历史互动均值，通常为互动量的20-50倍（小红书）或50-100倍（视频号）
- 达标所需最低曝光量 = 花费 ÷ CPM上限 × 1000

【风险等级】
- 高风险：内容明显硬广、直接点名竞品、虚假宣称功效
- 中风险：账号类型与内容风格不匹配、选题与总部内容高度重复
- 低风险：内容自然、角度差异化、账号与选题匹配"""


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
请严格按以下6个维度评估，输出JSON（所有字段必须填写，字符串用双引号，数字不加引号）：

{{
  "alignment": {{
    "score": "高|中|低",
    "note": "①是否覆盖至少1个核心记忆点；②传播角度是否呼应品牌心智目标；③如有缺失，指出具体补充方向"
  }},
  "differentiation": "①与总部已发内容是否重复（明确说重复/部分重复/差异化好）；②区域特色加分点是否清晰；③是否将品牌传播误做成了种草内容（若是，说明区别）",
  "platform_environment": "①选题方向在该平台的竞争密度（高/中/低），判断依据；②用户在该平台对此类内容的接受度；③若区域未填平台调研，给出该方向可能面临的内容环境提示",
  "account_match": "①该账号类型是否适合此选题方向（依据系统规则判断）；②匹配则说明优势，不匹配则说明风险并给出更合适的账号类型建议；③号段选取具体建议",
  "roi": {{
    "cpm_min": 预测CPM下限数字,
    "cpm_max": 预测CPM上限数字,
    "min_exposure": 达标所需最低曝光量数字,
    "note": "CPM预测区间说明 + 与验收标准对比 + 是否预计达标"
  }},
  "risks": "风险等级（高/中/低）+ 具体风险点（硬广风险、平台降权风险、负面发酵隐患等）",
  "suggestions": ["可直接操作的具体建议1", "建议2", "建议3（最多3条，每条一句话）"]
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
