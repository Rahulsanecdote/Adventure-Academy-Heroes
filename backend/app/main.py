from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, children, quests, progress, admin
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    description="KidQuest Academy - Interactive Learning Platform for Kids",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(children.router)
app.include_router(quests.router)
app.include_router(progress.router)
app.include_router(admin.router)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.app_name}

@app.get("/api")
async def root():
    return {
        "message": "Welcome to KidQuest Academy API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)