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

    key_points = project_data.get("key_memory_points", [])
    key_points_str = "、".join(key_points) if key_points else "（未设置）"
    baseline = (topic_data.get("account_avg_likes", 0)
                + topic_data.get("account_avg_comments", 0)
                + topic_data.get("account_avg_shares", 0))

    prompt = f"""[验收评估任务]
项目：{project_data.get("name", "")}
品牌心智目标：{project_data.get("brand_mind_goal", "")}
本项目核心记忆点（需逐条检验）：{key_points_str}

传播数据：
- 渠道：{channel} / 账号类型：{topic_data.get("account_type", "")}
- 曝光量：{impressions:,} / 互动量：{interactions:,} / 实际花费：{actual_cost} 元
- CPM：{cpm:.1f} / 验收标准：CPM ≤ {standard.get("cpm_limit", "N/A")}，互动量 ≥ {standard.get("interaction_min", 1000)}
- 账号历史互动均值：{baseline}

评论区自评（区域填写）：
{submission_data.get("comment_self_review", "（未填写）")}

请输出JSON：
{{
  "memory_point_hits": {{
    "mentioned": ["在评论区中有迹象出现的记忆点，从{key_points_str}中选取"],
    "not_mentioned": ["未出现的记忆点"],
    "top10_brand_ratio": "前十条评论中品牌/产品相关内容估算占比，如「约40%」",
    "note": "心智渗透质量说明：哪些词出现、出现形式（主动提及/被动回应）、是否形成有效认知"
  }},
  "performance_vs_baseline": "本次互动量{interactions}与账号均值{baseline}对比，高于/低于均值X%",
  "overall_grade": "A|B|C|D",
  "grade_reason": "评级理由（A=量化达标+至少2个记忆点出现在评论；B=量化达标但记忆点出现少；C=量化未达标但记忆点或内容质量有亮点；D=量化未达标且内容偏离主线）",
  "suggestions": ["针对该区域下次传播的具体改进建议，聚焦如何提升记忆点植入有效性", "建议2"]
}}"""

    raw_text = _call(SYSTEM_PROMPT, prompt, max_tokens=1200)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"mind_penetration": raw_text[:300], "overall_grade": "C", "grade_reason": "解析失败", "suggestions": []}


# ── 天赋探测仪 ──────────────────────────────────────────────────────────────────

TALENT_SYSTEM_PROMPT = """你是一位温暖、有洞察力的天赋与职业教练，擅长帮人度过「奥德赛时期」——
那段二三十岁常见的探索、漂泊、迷茫、反复怀疑自己的人生阶段。

你的信念：每个人小时候自然擅长、乐在其中的事，藏着他一生的天赋线索。你的工作是把这些线索
翻译成「被看见」的语言，让对方在 AI 时代的焦虑（AI FOMO）里，重新找到属于自己的赛道和出口。

【语气与原则】
- 第二人称「你」，温暖、真诚、具体，像一位懂你的朋友，而不是测评机器。
- 多用对方填写的真实细节作为证据，让他感到「真的被读懂了」。
- 既给方向，也给情绪价值：哪怕暂时找不到完美职业，也要让对方感到被接住、有下一步可走。
- 谈 AI 时代时，强调「人的天赋如何与 AI 协作放大」，而不是制造恐慌。
- 不输出空洞鸡汤，每条建议都要可落地、有出口（哪怕是低门槛的小尝试）。

输出必须是严格的 JSON，不包含任何额外文字或 markdown 代码块。"""


def build_talent_prompt(inputs: dict) -> str:
    skills = [s for s in (inputs.get("childhood_skills") or []) if str(s).strip()]
    skills_text = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(skills)) or "（未填写）"

    reflections = inputs.get("reflections") or {}
    flow = reflections.get("flow") or "（未填写）"
    asked_for = reflections.get("asked_for") or "（未填写）"
    proud = reflections.get("proud_moment") or "（未填写）"

    nickname = inputs.get("nickname") or "朋友"

    return f"""[探测对象] {nickname}

[Ta 小时候最擅长的事]
{skills_text}

[补充反思]
- 做什么会忘记时间：{flow}
- 别人常找 Ta 帮的忙：{asked_for}
- 最有成就感的高光时刻：{proud}

[任务]
基于以上线索，提炼天赋、对应 AI 时代职业赛道，并给出情绪陪伴叙事。
严格输出以下 JSON（字符串用双引号，分值为 0-100 的整数，不加引号）：

{{
  "talent_themes": [
    {{
      "name": "天赋主题名（4-8字，如：结构化思维 / 共情联结 / 创造表达）",
      "strength": 0-100,
      "one_liner": "一句话点明这个天赋是什么",
      "evidence": ["呼应 Ta 填写的具体某件事，说明为何体现该天赋", "另一条证据"]
    }}
  ],
  "career_tracks": [
    {{
      "title": "职业/赛道名",
      "fit": 0-100,
      "why": "为什么这条赛道契合 Ta 的天赋",
      "ai_era_angle": "在 AI 时代，这条赛道为何有潜力、Ta 的天赋如何与 AI 协作被放大",
      "first_steps": ["现在就能做的第一步", "第二步"],
      "exits": ["低门槛的小出口/小尝试，哪怕只是先体验或获得情绪价值"]
    }}
  ],
  "odyssey_narrative": "一段 150-250 字的温暖第二人称叙事，正向回应 Ta 此刻的迷茫，串联 Ta 的天赋成长轨迹，给出被接住的感觉和方向感",
  "share_card": {{
    "headline": "一句有力量、适合转发的天赋金句（不超过 20 字）",
    "top_talents": ["核心天赋1", "核心天赋2", "核心天赋3"],
    "signature_track": "Ta 的主赛道（一个短语）"
  }}
}}

要求：talent_themes 给 3-5 个，career_tracks 给 3-4 个（按 fit 从高到低排序）。"""


def _talent_fallback(inputs: dict, raw_text: str = "") -> dict:
    """AI 不可用或解析失败时的降级结果：仍保证结构合法、仍有情绪价值。"""
    skills = [s for s in (inputs.get("childhood_skills") or []) if str(s).strip()]
    sample = "、".join(skills[:3]) if skills else "你愿意分享的那些事"
    return {
        "talent_themes": [
            {
                "name": "尚待解读的天赋",
                "strength": 60,
                "one_liner": "你填写的经历里藏着清晰的天赋线索，只是这次没能连上 AI 完成解读。",
                "evidence": [f"你提到的「{sample}」就是很好的起点"],
            }
        ],
        "career_tracks": [
            {
                "title": "先从一次小探索开始",
                "fit": 60,
                "why": "在还没有完整画像时，最好的方向是用低成本的行动继续收集关于自己的线索。",
                "ai_era_angle": "AI 时代最稀缺的，是清楚自己天赋、并愿意持续尝试的人。",
                "first_steps": ["把你最有感觉的 1 件事，本周做一次小练习", "记录做的时候的状态和能量"],
                "exits": ["稍后重新生成一次报告", "找一位朋友聊聊你填的这 20 件事"],
            }
        ],
        "odyssey_narrative": (
            "此刻的迷茫不是你出了问题，而是你正认真地寻找属于自己的赛道。"
            "你愿意回看小时候真正擅长、真正快乐的事，这本身就是一种难得的自我诚实。"
            "线索已经在你手里了——给自己一点时间，下一步会慢慢清晰起来。"
        ),
        "share_card": {
            "headline": "我正在认真寻找属于自己的赛道",
            "top_talents": ["自我觉察", "持续探索", "真诚"],
            "signature_track": "正在路上的探索者",
        },
        "_raw": raw_text,
        "_degraded": True,
    }


def analyze_talent(inputs: dict) -> dict:
    """根据用户输入分析天赋，返回 {result, raw}。AI 失败时走降级兜底。"""
    prompt = build_talent_prompt(inputs)
    try:
        raw_text = _call(TALENT_SYSTEM_PROMPT, prompt, max_tokens=2500)
    except Exception:
        return {"result": _talent_fallback(inputs), "raw": ""}

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        result = _talent_fallback(inputs, raw_text)

    return {"result": result, "raw": raw_text}
