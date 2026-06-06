import os, uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from config import get_settings
import models, auth
from rag.processor import index_document, delete_document_collection

router = APIRouter(prefix="/files", tags=["files"])
settings = get_settings()

# Types acceptés pour le RAG (indexation sémantique)
ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/csv": "csv",
    "application/json": "json",
}

ALLOWED_EXTENSIONS = {
    "pdf","docx","doc","xlsx","xls","pptx","ppt",
    "txt","md","csv","json","py","js","ts","html","xml"
}

MAX_SIZE = settings.max_upload_size_mb * 1024 * 1024

@router.get("")
async def list_documents(db=Depends(get_db), user=Depends(auth.get_current_user)):
    result = await db.execute(
        select(models.Document).where(models.Document.user_id == user.id)
        .order_by(models.Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [{"id": d.id, "filename": d.original_filename, "file_type": d.file_type,
             "file_size": d.file_size, "chunk_count": d.chunk_count, "created_at": d.created_at}
            for d in docs]

@router.post("", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    content_type = file.content_type or ""
    ext = Path(file.filename or "").suffix.lower().lstrip(".")
    file_type = ALLOWED_TYPES.get(content_type) or (ext if ext in ALLOWED_EXTENSIONS else None)

    if not file_type:
        raise HTTPException(415, f"Type non supporté pour le RAG : {ext or content_type}\n"
                                  f"Formats acceptés : PDF, DOCX, XLSX, PPTX, TXT, CSV, MD, JSON")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, f"Fichier trop volumineux (max {settings.max_upload_size_mb} Mo)")

    upload_dir = Path(settings.upload_dir) / str(user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}.{file_type}"
    (upload_dir / stored_name).write_bytes(content)

    doc = models.Document(user_id=user.id, filename=stored_name,
                          original_filename=file.filename, file_type=file_type,
                          file_size=len(content), collection_name="")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        collection_name, chunk_count = await index_document(
            str(upload_dir / stored_name), file_type, user.id, doc.id)
        doc.collection_name = collection_name
        doc.chunk_count = chunk_count
        await db.commit()
    except Exception as e:
        doc.collection_name = ""
        await db.commit()
        return {"id": doc.id, "filename": file.filename,
                "warning": f"Indexation RAG échouée : {str(e)}"}

    return {"id": doc.id, "filename": file.filename, "file_type": file_type,
            "chunk_count": chunk_count, "message": "Document indexé avec succès"}

@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db=Depends(get_db), user=Depends(auth.get_current_user)):
    result = await db.execute(
        select(models.Document).where(models.Document.id == doc_id, models.Document.user_id == user.id))
    doc = result.scalar_one_or_none()
    if not doc: raise HTTPException(404, "Document introuvable")
    if doc.collection_name: await delete_document_collection(doc.collection_name)
    try:
        fp = Path(settings.upload_dir) / str(user.id) / doc.filename
        if fp.exists(): fp.unlink()
    except: pass
    await db.delete(doc)
    await db.commit()
    return {"message": "Document supprimé"}
