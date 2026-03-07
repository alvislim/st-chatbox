# OWASP Chatbot Widget

A full-stack chatbot widget with RAG (Retrieval-Augmented Generation) that provides AI-powered answers about OWASP API security topics using Google's Gemini API.

## Architecture

- **Frontend**: React (TypeScript) — floating chatbot widget with responsive UI
- **Backend**: Express.js (TypeScript) — Gemini API integration, session management, RAG search
- **RAG**: Keyword-based search over the OWASP Q&A dataset (CSV), results are injected into the Gemini prompt for context-aware answers

## Prerequisites

- Node.js 18+
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

## Setup & Run Locally

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm install
npm start
```

The backend runs on `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and proxies API calls to the backend.

### 3. Run Both at Once

```bash
bash start.sh
```

This will install dependencies and launch both servers in parallel. Press `Ctrl+C` to stop both.

## Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and sign in with a Google account
2. Click "Create API Key" and select or create a Google Cloud project
3. Copy the generated key
4. Paste it into `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
5. The backend uses the `gemini-2.5-flash` model (free tier: 20 requests/day, 5 requests/minute)

## Project Structure

```
├── backend/
│   ├── server.ts                    # Express server entry point
│   ├── rag.ts                       # OWASP dataset loader and keyword search
│   ├── dataset.csv                  # OWASP Q&A dataset for RAG
│   ├── routes/
│   │   └── chatRoutes.ts            # API route definitions
│   ├── controllers/
│   │   ├── chatController.ts        # Chat endpoint handler
│   │   └── sessionController.ts     # Session endpoint handler
│   ├── services/
│   │   ├── chatService.ts           # Gemini API integration and prompt engineering
│   │   └── sessionService.ts        # In-memory session management
│   ├── tsconfig.json
│   ├── .env.example                 # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Landing page
│   │   ├── api/
│   │   │   └── chatApi.ts           # API service (session & chat requests)
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx       # Chat widget component
│   │   │   └── ChatWidget.css       # Chat widget styles
│   │   └── ...
│   ├── tsconfig.json
│   └── package.json
├── start.sh                         # Script to install deps and run both servers
└── .gitignore
```

## How RAG Works

1. When a user sends a message, the backend tokenizes the query and searches the OWASP Q&A dataset using keyword matching
2. The top 3 most relevant Q&A pairs are retrieved based on term frequency scoring (question matches weighted higher than answer matches)
3. The retrieved context is injected into the Gemini prompt alongside the conversation history
4. Gemini generates a response informed by both the OWASP data and its general knowledge

## Features

- Floating chat widget (bottom-right corner)
- Smooth open/close animations and typing indicators
- Session-based conversation history
- Input sanitization (HTML stripping) and length validation
- Rate limiting (20 requests/minute per client)
- Responsive design (mobile-friendly)
- RAG-enhanced responses for OWASP security topics
- Source attribution for RAG-retrieved data
- Retry with exponential backoff for API rate limits

## Security

- API keys stored in `.env` (excluded from git via `.gitignore`)
- HTTP security headers via `helmet` (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- User input sanitized: HTML/script tags stripped, trimmed, and length-limited to 2000 characters
- Rate limiting via `express-rate-limit` (20 requests/minute per client)
- CORS restricted to allowed origins via `CORS_ORIGIN` environment variable
- Graceful shutdown handling (SIGTERM) for production deployments

## Deployment

### Production Build

```bash
# Build the backend
cd backend
npm install
npm run build
# Compiled JS output goes to dist/

# Build the frontend
cd frontend
npm install
npm run build
# Static files go to build/
```

### Deploy on Render

**Backend (Web Service):**

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo
3. Set **Runtime** to **Node**
4. Set **Root Directory** to `backend`
5. Set **Build Command** to `npm install && npm run build`
6. Set **Start Command** to `npm run start:prod`
7. Add environment variables:
   - `GEMINI_API_KEY` — your Gemini API key
   - `CORS_ORIGIN` — your frontend URL (e.g. `https://your-frontend.onrender.com`)
   - `PORT` — `10000` (Render's default)

**Frontend (Static Site):**

1. Create a new **Static Site** on Render
2. Connect the same GitHub repo
3. Set **Root Directory** to `frontend`
4. Set **Build Command** to `npm install && npm run build`
5. Set **Publish Directory** to `build`
6. Add environment variable:
   - `REACT_APP_API_URL` — your backend URL (e.g. `https://your-backend.onrender.com`)

**After both are deployed:**

1. Copy the frontend Static Site URL
2. Go to your backend Web Service → Environment → set `CORS_ORIGIN` to the frontend URL
3. Copy the backend Web Service URL
4. Go to your frontend Static Site → Environment → set `REACT_APP_API_URL` to the backend URL
5. Redeploy both services to pick up the new environment variables
