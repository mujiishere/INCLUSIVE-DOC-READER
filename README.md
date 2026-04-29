# Inclusive Document Reader

Beginner-friendly full-stack starter codebase for uploading scanned files, running placeholder OCR, storing extracted text, and searching documents.

## Project Scope (Current Starter)

This repository currently includes a clean scaffold for:

- User registration and login (DRF token auth)
- Uploading image/PDF files
- Placeholder OCR function (`run_ocr`) ready to be replaced by custom AI
- Saving extracted text in PostgreSQL
- Listing, viewing, and searching documents
- React pages and services wired to backend endpoint structure

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite, hooks only) |
| Backend | Django + Django REST Framework |
| Database | PostgreSQL |
| Auth | DRF Token Authentication |
| OCR | Custom OCR placeholder service |

## Repository Structure

```text
INCLUSIVE-DOC-READER/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── project/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── accounts/
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   └── documents/
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── ocr_service.py
└── frontend/
    ├── package.json
    ├── .env.example
    ├── index.html
    └── src/
        ├── App.jsx
        ├── components/
        ├── pages/
        └── services/
```

## API Endpoints (Starter)

All routes are under `/api/`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/register/` | Create user account |
| POST | `/api/login/` | Login and get token |
| POST | `/api/upload/` | Upload file + run OCR placeholder |
| GET | `/api/documents/` | List current user's documents |
| GET | `/api/documents/<id>/` | Get one document |
| GET | `/api/search/?q=keyword` | Search extracted text |

## Local Setup

### 1) Backend (Django)

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and update DB values.

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`.

### 2) Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

If needed, set `VITE_API_BASE_URL` in `frontend/.env`.

## PostgreSQL Notes

Default expected variables:

- `DB_NAME=inclusive_reader_db`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `DB_HOST=127.0.0.1`
- `DB_PORT=5432`

Create a matching PostgreSQL database/user before running migrations.

## Next Development Steps

- Add migration files for `Document` model
- Add form validation and API error messages in React pages
- Add tests for auth and document APIs
- Replace OCR placeholder with custom OCR model call

## License

MIT License. See `LICENSE`.
