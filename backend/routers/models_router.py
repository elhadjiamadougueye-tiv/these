from fastapi import APIRouter, Depends, HTTPException
import auth
import models as db_models
from ollama_client import get_ollama_client

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
async def list_models(_: db_models.User = Depends(auth.get_current_user)):
    try:
        async with get_ollama_client(timeout=10) as client:
            resp = await client.get("/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return {
                "models": [
                    {
                        "name": m["name"],
                        "size": m.get("size", 0),
                        "modified_at": m.get("modified_at"),
                        "details": m.get("details", {}),
                    }
                    for m in data.get("models", [])
                ]
            }
    except Exception as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status == 401:
            raise HTTPException(503, "Clé API Ollama invalide — vérifier OLLAMA_API_KEY dans .env")
        raise HTTPException(503, f"Ollama non disponible : {e}")


@router.get("/running")
async def running_models(_: db_models.User = Depends(auth.get_current_user)):
    try:
        async with get_ollama_client(timeout=10) as client:
            resp = await client.get("/api/ps")
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return {"models": []}
