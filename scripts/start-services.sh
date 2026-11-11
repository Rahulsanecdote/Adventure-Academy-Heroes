#!/bin/bash

echo "=================================================="
echo "🎮 KidQuest Academy - Starting Services"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Start Backend
echo -e "\n${YELLOW}Starting Backend...${NC}"
cd /app/backend
PYTHONPATH=/app/backend nohup /root/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Start Frontend
echo -e "\n${YELLOW}Starting Frontend...${NC}"
cd /app/frontend
nohup yarn dev --host 0.0.0.0 --port 3000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to start
echo "Waiting for frontend to initialize..."
sleep 10

# Check services
echo -e "\n${YELLOW}Checking Services...${NC}"

# Check backend
if curl -s http://localhost:8001/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC} - http://localhost:8001"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
fi

# Check frontend
if curl -s -I http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is running${NC} - http://localhost:3000"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
fi

echo -e "\n=================================================="
echo -e "${GREEN}🎮 KidQuest Academy is ready!${NC}"
echo "=================================================="
echo ""
echo "Access the application:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend API: http://localhost:8001"
echo "  • API Docs: http://localhost:8001/docs"
echo ""
echo "Admin account:"
echo "  • No default credentials exist. Seed with ADMIN_EMAIL and"
echo "    ADMIN_PASSWORD set in the environment to create an admin."
echo ""
echo "Logs:"
echo "  • Backend: /tmp/backend.log"
echo "  • Frontend: /tmp/frontend.log"
echo ""
