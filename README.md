# 📄 Inclusive Document Reader

> A web-based multilingual OCR system for processing scanned PDFs and images in regional Indian languages.

**Course:** 22AIE311 Software Engineering | Amrita Vishwa Vidyapeetham  
**Team:** Adhwaith B Pillai · Dano Aby Alex · N Mujeeb Rahman

---

## 🧠 What It Does

Accepts scanned PDFs/images → detects language (Malayalam, Tamil, Hindi, Urdu, English, etc.) → extracts text via multilingual OCR → enables full-text search, keyword highlighting, tagging, and structured export.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│        FRONTEND (React + Vite)      │
│  Upload │ Search │ Highlight │ Tags │
└──────────────────┬──────────────────┘
                   │ REST API
┌──────────────────▼──────────────────┐
│       BACKEND (FastAPI / Python)    │
│   Auth │ Routing │ Pipeline Control │
└──────┬───────────────────┬──────────┘
       │                   │
┌──────▼──────┐   ┌────────▼──────────┐
│  OCR Engine │   │   PostgreSQL DB   │
│  Tesseract  │   │  Text+Tags+Meta   │
│  OpenCV     │   └────────┬──────────┘
│  langdetect │            │
└─────────────┘   ┌────────▼──────────┐
                  │  Elasticsearch    │
                  │  Full-text index  │
                  └───────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+, Docker, Tesseract 5.x

```bash
# Install Tesseract with language packs
sudo apt install tesseract-ocr tesseract-ocr-mal tesseract-ocr-tam tesseract-ocr-hin tesseract-ocr-urd
```

### Run with Docker (Recommended)
```bash
git clone https://github.com/<your-username>/inclusive-doc-reader.git
cd inclusive-doc-reader
docker-compose up --build
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:8000  
- API Docs: http://localhost:8000/docs

### Manual Setup
```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your values
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

---

## 📁 Project Structure

```
inclusive-doc-reader/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── routes/              # upload, search, documents, auth
│   │   ├── services/            # OCR, preprocessing, lang detect, indexing
│   │   ├── models/              # SQLAlchemy ORM models
│   │   └── utils/               # PDF & file helpers
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # UploadZone, DocumentViewer, SearchBar, etc.
│   │   ├── pages/               # Home, Dashboard, Login
│   │   └── services/api.js      # Axios API layer
│   └── Dockerfile
├── docker-compose.yml
└── docs/
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| OCR | Tesseract 5.x |
| Image Processing | OpenCV + Pillow |
| Language Detection | langdetect / fastText |
| Database | PostgreSQL |
| Search | Elasticsearch |
| Containers | Docker + Compose |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload scanned PDF/image |
| GET | `/documents` | List all processed documents |
| GET | `/documents/{id}` | Get document text & metadata |
| GET | `/search?q=keyword` | Full-text search |
| POST | `/documents/{id}/tags` | Add tags to a document |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 🌿 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready |
| `dev` | Integration branch |
| `feature/ocr-engine` | OCR + language detection |
| `feature/frontend-ui` | React UI components |
| `feature/search` | Elasticsearch integration |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
