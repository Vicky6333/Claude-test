#!/bin/bash
# 零售商品传播协同平台 - 本地一键启动脚本
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  零售商品传播协同平台 - 启动中...${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查 .env
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo -e "${YELLOW}⚠️  请先编辑 backend/.env，填写 DEEPSEEK_API_KEY，然后重新运行此脚本${NC}"
  exit 1
fi

if grep -q "your-deepseek-key-here" backend/.env; then
  echo -e "${YELLOW}⚠️  请先在 backend/.env 中填写真实的 DEEPSEEK_API_KEY${NC}"
  exit 1
fi

# 启动 PostgreSQL
echo -e "${BLUE}▶ 启动数据库...${NC}"
if ! pg_isready -q 2>/dev/null; then
  sudo service postgresql start
fi
sudo -u postgres psql -c "CREATE DATABASE retail_collab;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

# 安装后端依赖
echo -e "${BLUE}▶ 安装后端依赖...${NC}"
if [ ! -d backend/venv ]; then
  python3 -m venv backend/venv
fi
backend/venv/bin/pip install -q -r backend/requirements.txt

# 构建前端
echo -e "${BLUE}▶ 构建前端...${NC}"
cd frontend
npm install --silent
npm run build
cd ..

# 复制前端到后端静态目录
mkdir -p backend/app/static
cp -r frontend/dist/. backend/app/static/

# 启动
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 启动成功！${NC}"
echo -e "${GREEN}   本地访问: http://localhost:8000${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "登录账号："
echo -e "  总部: admin / admin123"
echo -e "  区域: region_bj / region123"
echo ""

source backend/.env
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/retail_collab" \
SECRET_KEY="${SECRET_KEY:-dev-secret-key}" \
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
