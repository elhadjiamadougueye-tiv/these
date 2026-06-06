"""
Client HTTP centralisé pour Ollama.
Injecte automatiquement le header Authorization si une clé API est configurée.
Correspond à l'auth Nginx Bearer décrite dans configuration_serveur_ollama.md
"""
import httpx
from config import get_settings

settings = get_settings()


def ollama_headers() -> dict:
    """Retourne les headers à envoyer à Ollama (avec Bearer si configuré)."""
    h = {"Content-Type": "application/json"}
    if settings.ollama_api_key:
        h["Authorization"] = f"Bearer {settings.ollama_api_key}"
    return h


def get_ollama_client(timeout: float = 30) -> httpx.AsyncClient:
    """Client httpx préconfiguré pour Ollama avec SSL et auth."""
    return httpx.AsyncClient(
        base_url=settings.ollama_base_url,
        headers=ollama_headers(),
        timeout=timeout,
        # Vérification SSL activée (votre cert unchk.sn est valide)
        verify=True,
    )


def get_ollama_stream_client() -> httpx.AsyncClient:
    """Client httpx pour les requêtes streaming (timeout long)."""
    return httpx.AsyncClient(
        base_url=settings.ollama_base_url,
        headers=ollama_headers(),
        timeout=httpx.Timeout(connect=30, read=1800, write=60, pool=30),
        verify=True,
    )
