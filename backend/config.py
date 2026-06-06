from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de données
    database_url: str = "postgresql+asyncpg://chatuser:changeme@localhost:5432/ollamachat"

    # JWT
    secret_key: str = "changez_ce_secret_en_prod"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h

    # ── Ollama ──────────────────────────────────────────────
    # URL complète avec port Nginx (11435) ou localhost (11434)
    ollama_base_url: str = "https://tamarin.unchk.sn:11435"

    # Clé Bearer pour s'authentifier auprès du proxy Nginx
    # Vide = pas d'auth (accès direct localhost sans Nginx)
    ollama_api_key: str = ""

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8000

    # Fichiers
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # Admin initial
    first_admin_email: str = "admin@local.dev"
    first_admin_password: str = "Admin1234!"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
