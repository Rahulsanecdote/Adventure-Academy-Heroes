import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import admin, auth, children, progress, quests

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

# Include API routers
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


def _resolve_frontend_dist() -> Path | None:
    env_override = os.getenv("FRONTEND_DIST_PATH")
    if env_override:
        candidate = Path(env_override).expanduser().resolve()
        if candidate.exists():
            return candidate

    repo_root = Path(__file__).resolve().parents[2]
    candidates = [
        repo_root / "frontend" / "dist",
        Path(__file__).resolve().parent / "static",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


# Serve frontend build from the same FastAPI port when available.
FRONTEND_DIST = _resolve_frontend_dist()
if FRONTEND_DIST is not None:
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    async def serve_spa_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Keep API/docs routes handled by FastAPI; everything else falls back to SPA.
        if full_path.startswith(("api", "docs", "openapi.json", "redoc")):
            raise HTTPException(status_code=404, detail="Not Found")

        requested_file = FRONTEND_DIST / full_path
        if requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
