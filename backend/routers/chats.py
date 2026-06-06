import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
import models, auth
from ollama_client import get_ollama_stream_client, get_ollama_client
from rag.processor import query_user_documents

router = APIRouter(prefix="/chats", tags=["chats"])


class AttachmentData(BaseModel):
    type: str                        # "image" | "document"
    filename: str
    data: Optional[str] = None       # base64 pour images
    text: Optional[str] = None       # texte extrait pour documents
    media_type: Optional[str] = None
    word_count: Optional[int] = None


class SendMessageRequest(BaseModel):
    content: str = ""                # peut être vide si pièce jointe présente
    use_rag: bool = False
    rag_document_ids: Optional[List[int]] = None
    attachment: Optional[AttachmentData] = None


class CreateChatRequest(BaseModel):
    model: str
    title: Optional[str] = None
    system_prompt: Optional[str] = None


class UpdateChatRequest(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


async def get_user_chat(chat_id: int, user_id: int, db: AsyncSession) -> models.Chat:
    result = await db.execute(
        select(models.Chat)
        .options(selectinload(models.Chat.messages))
        .where(models.Chat.id == chat_id, models.Chat.user_id == user_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "Conversation introuvable")
    return chat


def serialize_message(m: models.Message) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "extra_data": m.extra_data,
        "created_at": m.created_at,
    }


@router.get("")
async def list_chats(db=Depends(get_db), user=Depends(auth.get_current_user)):
    result = await db.execute(
        select(
            models.Chat,
            func.count(models.Message.id).label("msg_count")
        )
        .outerjoin(models.Message, models.Message.chat_id == models.Chat.id)
        .where(models.Chat.user_id == user.id)
        .group_by(models.Chat.id)
        .order_by(models.Chat.updated_at.desc())
    )
    return [
        {"id": c.id, "title": c.title, "model": c.model, "is_shared": c.is_shared,
         "share_token": c.share_token, "created_at": c.created_at,
         "updated_at": c.updated_at, "message_count": count}
        for c, count in result.all()
    ]


@router.post("", status_code=201)
async def create_chat(payload: CreateChatRequest, db=Depends(get_db),
                      user=Depends(auth.get_current_user)):
    chat = models.Chat(user_id=user.id, model=payload.model,
                       title=payload.title or "Nouvelle conversation",
                       system_prompt=payload.system_prompt)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return {"id": chat.id, "title": chat.title, "model": chat.model}


@router.get("/{chat_id}")
async def get_chat(chat_id: int, db=Depends(get_db), user=Depends(auth.get_current_user)):
    chat = await get_user_chat(chat_id, user.id, db)
    return {"id": chat.id, "title": chat.title, "model": chat.model,
            "system_prompt": chat.system_prompt, "is_shared": chat.is_shared,
            "share_token": chat.share_token,
            "messages": [serialize_message(m) for m in chat.messages]}


@router.put("/{chat_id}")
async def update_chat(chat_id: int, payload: UpdateChatRequest, db=Depends(get_db),
                      user=Depends(auth.get_current_user)):
    chat = await get_user_chat(chat_id, user.id, db)
    if payload.title: chat.title = payload.title
    if payload.system_prompt is not None: chat.system_prompt = payload.system_prompt
    await db.commit()
    return {"message": "ok"}


@router.delete("/{chat_id}")
async def delete_chat(chat_id: int, db=Depends(get_db), user=Depends(auth.get_current_user)):
    chat = await get_user_chat(chat_id, user.id, db)
    await db.delete(chat)
    await db.commit()
    return {"message": "Conversation supprimée"}


@router.post("/{chat_id}/share")
async def toggle_share(chat_id: int, db=Depends(get_db), user=Depends(auth.get_current_user)):
    chat = await get_user_chat(chat_id, user.id, db)
    if chat.is_shared:
        chat.is_shared = False
        chat.share_token = None
    else:
        chat.generate_share_token()
    await db.commit()
    return {"is_shared": chat.is_shared, "share_token": chat.share_token}


@router.get("/shared/{token}")
async def get_shared_chat(token: str, db=Depends(get_db)):
    result = await db.execute(
        select(models.Chat).where(models.Chat.share_token == token, models.Chat.is_shared == True))
    chat = result.scalar_one_or_none()
    if not chat: raise HTTPException(404, "Conversation introuvable ou non partagée")
    return {"id": chat.id, "title": chat.title, "model": chat.model,
            "messages": [serialize_message(m) for m in chat.messages]}


@router.post("/{chat_id}/messages/stream")
async def stream_message(chat_id: int, payload: SendMessageRequest,
                         db=Depends(get_db), user=Depends(auth.get_current_user)):

    # Validation : contenu ou pièce jointe obligatoire
    if not payload.content.strip() and not payload.attachment:
        raise HTTPException(400, "Message vide — ajoutez du texte ou une pièce jointe")

    chat = await get_user_chat(chat_id, user.id, db)

    # ── Construire le contenu envoyé à Ollama ───────────────────
    ollama_content = payload.content.strip()

    if payload.attachment:
        att = payload.attachment
        if att.type == "document" and att.text:
            doc_block = f"=== Fichier joint : {att.filename} ===\n\n{att.text}\n\n"
            if ollama_content:
                ollama_content = doc_block + f"Question : {ollama_content}"
            else:
                ollama_content = doc_block + "Analyse et résume ce document."
        elif att.type == "image" and not ollama_content:
            ollama_content = "Décris cette image en détail."

    # RAG
    if payload.use_rag and payload.rag_document_ids:
        result = await db.execute(
            select(models.Document).where(
                models.Document.id.in_(payload.rag_document_ids),
                models.Document.user_id == user.id))
        docs = result.scalars().all()
        collections = [d.collection_name for d in docs if d.collection_name]
        if collections:
            context = await query_user_documents(user.id, collections, payload.content)
            if context:
                ollama_content = context + (f"Question : {payload.content}" if payload.content else ollama_content)

    # ── Historique ──────────────────────────────────────────────
    history = [{"role": m.role, "content": m.content} for m in chat.messages]

    messages = []
    if chat.system_prompt:
        messages.append({"role": "system", "content": chat.system_prompt})
    messages.extend(history)

    user_msg_ollama = {"role": "user", "content": ollama_content}
    if payload.attachment and payload.attachment.type == "image" and payload.attachment.data:
        user_msg_ollama["images"] = [payload.attachment.data]
    messages.append(user_msg_ollama)

    # ── Sauvegarder le message utilisateur en DB ────────────────
    display_content = payload.content.strip()
    if not display_content and payload.attachment:
        display_content = f"[Fichier joint : {payload.attachment.filename}]"

    user_extra = None
    if payload.attachment:
        att = payload.attachment
        user_extra = {
            "type": att.type,
            "filename": att.filename,
            "media_type": att.media_type,
            "word_count": att.word_count,
            # Stocker base64 uniquement pour les images (pour affichage persistant)
            "data": att.data if att.type == "image" else None,
        }

    db.add(models.Message(
        chat_id=chat.id, role="user",
        content=display_content, extra_data=user_extra))
    await db.commit()

    auto_title = len(chat.messages) <= 1

    async def generate():
        full_response = ""
        try:
            async with get_ollama_stream_client() as client:
                async with client.stream("POST", "/api/chat",
                    json={"model": chat.model, "messages": messages, "stream": True}) as resp:
                    if resp.status_code == 401:
                        yield f"data: {json.dumps({'error': 'Clé API Ollama invalide'})}\n\n"
                        return
                    async for line in resp.aiter_lines():
                        if not line: continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            if token:
                                full_response += token
                                yield f"data: {json.dumps({'token': token})}\n\n"
                            if data.get("done"): break
                        except: continue

            db.add(models.Message(
                chat_id=chat.id, role="assistant",
                content=full_response, model=chat.model))

            await db.commit()
            print(f"[TITLE] reached: auto={auto_title} resp={len(full_response)} content={bool(payload.content.strip())} att={bool(payload.attachment)}", flush=True)
            # ── Génération automatique du titre via gemma3:1b ──────────
            if auto_title and full_response and (payload.content.strip() or (payload.attachment and payload.attachment.filename)):
                user_text = payload.content.strip() or (payload.attachment.filename if payload.attachment else "")
                new_title = None
                try:
                    title_prompt = (
                        "Génère UN SEUL titre court (3 à 6 mots) en français pour cette conversation. "
                        "Réponds uniquement par le titre, sans guillemets ni ponctuation finale ni liste.\n\n"
                        f"Question: {user_text[:400]}\n"
                        f"Réponse: {full_response[:400]}\n\n"
                        "Titre:"
                    )
                    async with get_ollama_client(timeout=20) as tc:
                        r = await tc.post("/api/generate", json={
                            "model": "gemma3:1b",
                            "prompt": title_prompt,
                            "stream": False,
                            "options": {"temperature": 0.2, "num_predict": 25, "stop": ["\n"]}
                        })
                        if r.status_code == 200:
                            gen = r.json().get("response", "").strip()
                            gen = gen.split("\n")[0].strip(' "\'`*-.,!?:;')
                            if 3 <= len(gen) <= 80:
                                new_title = gen
                except Exception:
                    pass
                if not new_title:
                    words = user_text.split()
                    new_title = " ".join(words[:8]) + ("..." if len(words) > 8 else "")
                print(f"[TITLE] new_title='{new_title}' chat.id={chat.id} chat.title_avant='{chat.title}'", flush=True)
                chat.title = new_title
                await db.commit()
                print(f"[TITLE] chat.title_apres='{chat.title}' commit OK", flush=True)
                # Vérification BDD
                await db.refresh(chat)
                print(f"[TITLE] refresh DB title='{chat.title}'", flush=True)
            yield f"data: {json.dumps({'done': True, 'title': chat.title})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
