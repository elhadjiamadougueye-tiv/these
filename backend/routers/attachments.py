"""
Pièces jointes dans le chat — images (vision) et documents (extraction texte).
"""
import base64, os, tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import models, auth
from rag.processor import extract_text

router = APIRouter(prefix="/attachments", tags=["attachments"])

IMAGE_TYPES  = {"image/jpeg","image/png","image/gif","image/webp","image/jpg"}
IMAGE_EXTS   = {"jpg","jpeg","png","gif","webp"}

# MIME types → extension pour les documents
DOC_TYPE_MAP = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/markdown": "md",
    "application/json": "json",
    "application/octet-stream": None,  # fallback sur l'extension
}

DOC_EXTS = {"pdf","docx","doc","xlsx","xls","pptx","ppt","txt","csv","md","json","py","js","ts"}

MAX_SIZE = 20 * 1024 * 1024  # 20 Mo


@router.post("")
async def upload_attachment(
    file: UploadFile = File(...),
    _: models.User = Depends(auth.get_current_user),
):
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "Fichier trop volumineux (max 20 Mo)")

    ct  = (file.content_type or "").split(";")[0].strip().lower()
    ext = Path(file.filename or "").suffix.lower().lstrip(".")

    # ── Image ────────────────────────────────────────────────────
    if ct in IMAGE_TYPES or ext in IMAGE_EXTS:
        b64 = base64.b64encode(content).decode()
        media_type = ct if ct in IMAGE_TYPES else f"image/{ext}"
        return {
            "type": "image",
            "filename": file.filename,
            "data": b64,
            "media_type": media_type,
        }

    # ── Document — déterminer le type ────────────────────────────
    file_type = DOC_TYPE_MAP.get(ct)

    # Si MIME inconnu ou octet-stream, utiliser l'extension
    if not file_type:
        file_type = ext if ext in DOC_EXTS else None

    if not file_type:
        raise HTTPException(
            415,
            f"Format non supporté : .{ext}\n"
            f"Formats acceptés : PDF, DOCX, XLSX, XLS, PPTX, TXT, CSV, MD"
        )

    # ── Extraction du texte ──────────────────────────────────────
    with tempfile.NamedTemporaryFile(suffix=f".{file_type}", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        text = extract_text(tmp_path, file_type)
    finally:
        os.unlink(tmp_path)

    if not text.strip():
        raise HTTPException(422, "Impossible d'extraire le texte de ce document")

    # Tronquer à 8000 mots
    words = text.split()
    truncated = len(words) > 8000
    if truncated:
        text = " ".join(words[:8000]) + "\n\n[... document tronqué]"

    return {
        "type": "document",
        "filename": file.filename,
        "text": text,
        "word_count": len(words),
        "truncated": truncated,
    }
