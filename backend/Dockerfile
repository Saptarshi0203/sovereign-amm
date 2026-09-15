# Build context is the repository root (see docker-compose.yml) because the
# API imports the top-level `engine`, `simulation` and `backend` packages.
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY engine ./engine
COPY simulation ./simulation
COPY rag_sidecar ./rag_sidecar
COPY backend ./backend

RUN chmod +x backend/start.sh

EXPOSE 8000
CMD ["./backend/start.sh"]
