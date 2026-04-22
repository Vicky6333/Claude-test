from datetime import date
from sqlalchemy.orm import Session
from . import models
from .auth import get_password_hash


def seed_demo_data(db: Session):
    if db.query(models.User).count() > 0:
        return

    # ── Users ──
    admin = models.User(username="admin", email="admin@retail.com",
        hashed_password=get_password_hash("admin123"),
        role="headquarters", display_name="陈晓（总部）")
    bj = models.User(username="region_bj", email="bj@retail.com",
        hashed_password=get_password_hash("region123"),
        role="region", region="北京", display_name="张磊（北京）")
    sh = models.User(username="region_sh", email="sh@retail.com",
        hashed_password=get_password_hash("region123"),
        role="region", region="上海", display_name="李薇（上海）")
    gz = models.User(username="region_gz", email="gz@retail.com",
        hashed_password=get_password_hash("region123"),
        role="region", region="广州", display_name="王强（广州）")
    db.add_all([admin, bj, sh, gz])
    db.flush()

    # ── Project ──
    proj = models.Project(
        name="2025冬季花香蓝莓传播",
        product="水果 · PB品",
        start_date=date(2025, 2, 2),
        end_date=date(2025, 3, 2),
        cities=["北京","廊坊","天津","上海","昆山","广州","深圳","武汉","杭州","南京","成都","西安"],
        main_narrative=(
            "以云南高原基地的花香蓝莓为典型案例，透传小象超市「产地直采、前置品控」的供应链能力。"
            "冬季国内蓝莓淡季，小象逆势从云南高原引入L25花香品种，六道质检+全程0-4℃冷链，"
            "48小时、近3000公里恒温送达。核心目标：巩固「社区冰箱」用户心智，强化「又快又新鲜」的商品力认知。"
        ),
        key_memory_points=["高原果", "厚霜果", "锁香人", "恒温之旅", "反向供给", "社区冰箱", "花香蓝莓"],
        brand_mind_goal="小象超市深入源头直采，全程冷链保鲜，是靠谱的社区冰箱",
        hq_content_summary=(
            "①官微图文《在1800米高原，找一颗会开花的蓝莓》，角度为供应链探源+锁香人故事；"
            "②小红书矩阵含单品安利、功效延伸、女性力量+源头故事、KOL精细植入四个方向，已发约15条；"
            "③通讯长文《高原果进城记》供媒体摘引。区域传播须做差异化，避免与总部内容重复。"
        ),
        budget=80000,
        status="completed",
        created_by=admin.id,
    )
    db.add(proj)
    db.flush()

    # ── Materials ──
    mats = [
        models.Material(
            project_id=proj.id, type="传播策略文档",
            name="【总部】花香蓝莓区域传播素材包",
            description="区域传播完整指导文档。含传播背景、区域策略、核心记忆点释义（高原果/厚霜果/锁香人/恒温之旅/社区冰箱）、阐述逻辑及物料汇总入口。区域策划选题的首要参考。",
            channels=["小红书", "视频号", "微信图文", "都市媒体"],
            link="https://km.sankuai.com/collabpage/内部链接示例",
            usage_note="请勿直接转发通稿，摘取记忆点和阐述逻辑后结合本地消费者特色进行二次创作。",
            created_by=admin.id,
        ),
        models.Material(
            project_id=proj.id, type="通讯长文",
            name="高原果进城记：一条冷链，链起雪山与都市",
            description="约3000字深度通讯，分四部分：①花香密码（品种L25+海拔+精准灌溉）②采摘大王施玉梅的女性力量故事③恒温之旅（品控员王培文全程温控守护）④反向供给的行业价值。可供区域媒体摘引。",
            channels=["都市媒体", "微信图文"],
            link="https://km.sankuai.com/collabpage/2745342436",
            usage_note="可摘取产地描写、供应链数据、人物故事，但需结合当地角度二次加工。",
            created_by=admin.id,
        ),
        models.Material(
            project_id=proj.id, type="图片素材",
            name="花香蓝莓高清图库",
            description="产地实拍精华图约20张：基地全景、晨雾中蓝莓果实特写（厚霜细节）、采摘工人操作、品控分拣、冷链车装箱、GPS温度计等，全部可用于传播配图。",
            channels=["小红书", "视频号", "微信图文"],
            link="https://km.sankuai.com/collabpage/2746079959",
            usage_note="建议优先选取有厚霜细节和人物故事感的图片，视觉冲击力更强。",
            created_by=admin.id,
        ),
    ]
    db.add_all(mats)
    db.flush()

    # ── Topics ──
    topics = [
        models.Topic(
            project_id=proj.id, channel="小红书", account_type="KOC",
            direction=(
                "以北京妈妈视角写给孩子挑蓝莓的踩坑经历：买了好几次酸的蓝莓，"
                "后来发现果霜厚不厚、果蒂黑不黑才是判断新鲜度的关键，顺带讲花香蓝莓的辨别方法。"
                "内容素人感强，结尾自然带出小象花香蓝莓。"
            ),
            account_avg_likes=800, account_avg_comments=120, account_avg_shares=300,
            estimated_cost=3000,
            material_ids=[str(mats[0].id), str(mats[2].id)],
            platform_content_info="搜索「花香蓝莓」约有2000+篇笔记，妈妈带娃视角+辨别技巧角度较少，差异化空间大。",
            status="已完成", created_by=bj.id,
        ),
        models.Topic(
            project_id=proj.id, channel="小红书", account_type="KOL",
            direction=(
                "从「蓝莓上的白霜到底是什么」这个常见误区切入，做科普辟谣："
                "很多人以为白霜是农药拼命洗，其实果霜是新鲜度标志还含花青素，洗掉反而是浪费。"
                "知识感强，评论区可引导讨论。"
            ),
            account_avg_likes=3500, account_avg_comments=280, account_avg_shares=1200,
            estimated_cost=8000,
            material_ids=[str(mats[0].id), str(mats[2].id)],
            platform_content_info="「蓝莓白霜是农残」相关话题已有一定讨论量，辟谣向内容互动率普遍偏高。",
            status="执行中", created_by=sh.id,
        ),
    ]
    db.add_all(topics)
    db.commit()
