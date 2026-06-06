.PHONY: up down build logs restart shell-backend shell-db backup

# Démarrer tous les services
up:
	docker compose up -d

# Arrêter
down:
	docker compose down

# Rebuild complet
build:
	docker compose build --no-cache

# Logs en live
logs:
	docker compose logs -f

# Logs d'un service
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Redémarrer un service
restart-backend:
	docker compose restart backend

# Shell dans le backend
shell-backend:
	docker compose exec backend bash

# Shell PostgreSQL
shell-db:
	docker compose exec postgres psql -U chatuser -d ollamachat

# Backup base de données
backup:
	docker compose exec postgres pg_dump -U chatuser ollamachat | gzip > backup-$(shell date +%Y%m%d-%H%M%S).sql.gz
	@echo "Backup créé."

# Générer une SECRET_KEY
gen-secret:
	@openssl rand -hex 32
