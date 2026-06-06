from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import auth, models
from services.transcribe import transcribe

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

ALLOWED_AUDIO = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
                 "audio/wav", "audio/x-wav", "application/octet-stream"}
MAX_SIZE = 25 * 1024 * 1024  # 25 Mo


@router.post("")
async def transcribe_audio(
    file: UploadFile = File(...),
    _: models.User = Depends(auth.get_current_user),
):
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "Fichier audio trop volumineux (max 25 Mo)")
    text = await transcribe(content, file.filename or "audio.webm")
    if not text:
        raise HTTPException(422, "Transcription vide — vérifiez la qualité audio")
    return {"text": text}
