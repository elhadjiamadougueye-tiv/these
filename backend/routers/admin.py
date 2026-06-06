from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import get_db
import models, auth

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    is_admin: bool = False


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(auth.get_current_admin),
):
    result = await db.execute(select(models.User).order_by(models.User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.post("/users", status_code=201)
async def create_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(auth.get_current_admin),
):
    # Vérifier unicité
    exists = await db.execute(
        select(models.User).where(
            (models.User.email == payload.email) | (models.User.username == payload.username)
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Email ou username déjà utilisé")

    user = models.User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=auth.hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email}


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    current: models.User = Depends(auth.get_current_admin),
):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    if payload.username is not None:
        user.username = payload.username
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.password:
        user.hashed_password = auth.hash_password(payload.password)
    if payload.is_admin is not None:
        # Empêcher l'admin de se retirer ses droits
        if user.id == current.id:
            raise HTTPException(400, "Vous ne pouvez pas modifier vos propres droits admin")
        user.is_admin = payload.is_admin
    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.commit()
    return {"message": "Utilisateur mis à jour"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current: models.User = Depends(auth.get_current_admin),
):
    if user_id == current.id:
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    await db.delete(user)
    await db.commit()
    return {"message": "Utilisateur supprimé"}


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(auth.get_current_admin),
):
    users_count = await db.scalar(select(func.count(models.User.id)))
    chats_count = await db.scalar(select(func.count(models.Chat.id)))
    messages_count = await db.scalar(select(func.count(models.Message.id)))
    docs_count = await db.scalar(select(func.count(models.Document.id)))
    return {
        "users": users_count,
        "chats": chats_count,
        "messages": messages_count,
        "documents": docs_count,
    }


@router.get("/documents")
async def list_all_documents(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(auth.get_current_admin),
):
    """Vue admin : tous les documents de tous les utilisateurs."""
    result = await db.execute(
        select(models.Document, models.User.username, models.User.email)
        .join(models.User, models.Document.user_id == models.User.id)
        .order_by(models.Document.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": doc.id,
            "filename": doc.original_filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "chunk_count": doc.chunk_count,
            "indexed": bool(doc.collection_name),
            "user": username,
            "email": email,
            "created_at": doc.created_at,
        }
        for doc, username, email in rows
    ]


@router.post("/reindex")
async def reindex_all_documents(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(auth.get_current_admin),
):
    from pathlib import Path
    from config import get_settings
    from rag.processor import index_document
    settings = get_settings()

    result = await db.execute(select(models.Document))
    docs = result.scalars().all()
    success, failed = [], []

    for doc in docs:
        file_path = Path(settings.upload_dir) / str(doc.user_id) / doc.filename
        if not file_path.exists():
            failed.append({"id": doc.id, "filename": doc.original_filename, "reason": "Fichier introuvable"})
            continue
        try:
            col, chunks = await index_document(str(file_path), doc.file_type, doc.user_id, doc.id)
            doc.collection_name = col
            doc.chunk_count = chunks
            await db.commit()
            success.append({"id": doc.id, "filename": doc.original_filename, "chunks": chunks})
        except Exception as e:
            failed.append({"id": doc.id, "filename": doc.original_filename, "reason": str(e)})

    return {"success": success, "failed": failed}
