# 零售商品传播协同平台

内部协同 Web 工具，覆盖传播项目从物料查阅到结果复盘的完整链路，通过 AI 辅助降低协同摩擦。

## 技术栈

- **前端**：React 18 + Tailwind CSS + Vite
- **后端**：Python FastAPI + SQLAlchemy
- **数据库**：PostgreSQL
- **AI**：Anthropic Claude API（claude-sonnet-4-6）

## 模块

| 模块 | 说明 |
|------|------|
| M1 · 项目总览 | 创建传播项目，查看各城市进度和 CPM 汇总 |
| M2 · 物料中心 | 总部维护物料链接，区域按类型筛选查阅 |
| M3 · 选题工作台 | 区域提交选题，AI 评估对齐度/差异化/ROI |
| M4 · 验收复盘 | CPM 自动计算，总部 AI 辅助验收，出验收结论 |

## 快速启动

### 环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填写 ANTHROPIC_API_KEY
```

### Docker Compose（推荐）

```bash
ANTHROPIC_API_KEY=sk-ant-xxx docker compose up
```

访问：
- 前端：http://localhost:3000
- 后端 API 文档：http://localhost:8000/docs

### 本地开发

**后端：**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/retail_collab \
ANTHROPIC_API_KEY=sk-ant-xxx \
uvicorn app.main:app --reload
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

## 演示账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 总部传播负责人 |
| region_bj | region123 | 北京区域BP |
| region_sh | region123 | 上海区域BP |
| region_gz | region123 | 广州区域BP |

## 权限说明

- **总部用户**：创建项目、管理物料、查看全部选题、触发 AI 验收评估、填写验收结论
- **区域用户**：查阅物料、提交选题、触发 AI 选题评估、提交传播成果
