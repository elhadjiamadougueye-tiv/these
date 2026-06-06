import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database import engine, Base
from config import get_settings
import models
import auth

settings = get_settings()


async def create_first_admin():
    """Crée l'admin initial si aucun utilisateur n'existe."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(models.User).limit(1))
        if result.scalar_one_or_none():
            return  # Déjà des utilisateurs

        admin = models.User(
            username="admin",
            email=settings.first_admin_email,
            full_name="Administrateur",
            hashed_password=auth.hash_password(settings.first_admin_password),
            is_admin=True,
        )
        db.add(admin)
        await db.commit()
        print(f"✅ Admin créé : {settings.first_admin_email}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Création des tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await create_first_admin()
    yield


app = FastAPI(
    root_path="/chat",
    title="Ollama Chat API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    swagger_ui_parameters={"url": "/chat/api/openapi.json"},
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import et enregistrement des routers
from routers import auth_router, admin, chats, files, models_router, attachments

app.include_router(auth_router.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(chats.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(models_router.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "ollama": settings.ollama_base_url}
