# DSE Spatial Architect

A full-stack WYSIWYG workspace for extracting exam question/answer blocks from PDFs, arranging layout slots, and compiling print-safe output.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: FastAPI + PyMuPDF + WeasyPrint + Jinja2
- Runtime: Docker Compose (image-based for both services)

## Current Docker Setup

This repository now runs both services from Docker images:

- Backend image: built from backend/Dockerfile (Python 3.11 slim)
- Frontend image: built from frontend/Dockerfile (Node 22 slim)
- Compose file: docker-compose.yml builds both images directly (no bind mounts)

## Quick Start (Recommended)

From the repository root:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Backend health check: http://localhost:8000/health

Health check from terminal:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Repository Structure

```text
dse-architect/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── processor.py
│   ├── pdf_generator.py
│   └── requirements.txt
└── frontend/
        ├── Dockerfile
        ├── index.html
        ├── package.json
        ├── package-lock.json
        ├── vite.config.js
        ├── tailwind.config.js
        ├── postcss.config.js
        └── src/
                ├── App.jsx
                ├── main.jsx
                └── index.css
```

## API Endpoints

- GET /health
    - Service liveness endpoint
- POST /api/extract
    - Upload question/answer PDFs and extract question units
- POST /api/compile
    - Compile arranged layout JSON into output PDF

## Notes

- GET / on backend may return 404; use /health or /docs for backend checks.
- Docker Compose may warn that version is obsolete in docker-compose.yml. This is a warning and does not block startup.