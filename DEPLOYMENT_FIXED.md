# Vercel Deployment Guide (KidQuest Academy)

This project now supports production deployment on Vercel with:

- Static frontend output from `frontend/dist`
- FastAPI backend as a serverless function (`/api/index.py`)
- SPA routing rewrite for frontend paths
- API rewrite for `/api/*`

## Vercel Project Settings

Set these environment variables in Vercel:

```env
MONGO_URL=<mongodb-atlas-uri>
SECRET_KEY=<strong-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

## Routing Behavior

- `/api/*` → FastAPI function
- `/*` → frontend SPA (`index.html`)

## Notes

- Use MongoDB Atlas (or another network-accessible MongoDB) in production.
- Do **not** use localhost MongoDB for Vercel deployments.
- Keep frontend API requests relative (`/api/...`) for same-domain deployment.
