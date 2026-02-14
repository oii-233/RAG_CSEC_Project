# ዘብ AI — Student Assistant

**ዘብ AI** is a RAG-enabled student assistant built to help students quickly find institutional information, report incidents, and access campus resources via 

conversational AI.

**Project overview**

- Conversational RAG chatbot backed by a vector store and generative model.
  
- Document ingestion (PDF/TXT/DOCX) with automatic text extraction and chunking.
  
- Role-based access (students/admins), chat history, and document management.

**Tech Stack**

- Frontend: React + TypeScript (Vite), Tailwind CSS
  
- Backend: Node.js + Express + TypeScript
  
- Database: MongoDB + Mongoose
  
- Authentication: JWT + bcrypt
  
- File uploads: multer
  
- PDF/DOCX parsing: pdf-parse / mammoth (or similar)
  
- RAG: embeddings (Voyage) + Gemini (gemini-2.5-flash) for generation
  
- Vector store: MongoDB Atlas Vector Search (or Pinecone/local alternative)

**Features**

- Sign up / Log in
  
- AI RAG chat (context-aware answers using uploaded documents)
  
- Upload/manage documents (PDF/TXT/DOCX) with automatic embedding
  
- View chat history and conversations
  
- Admin roles: upload and manage knowledge base
  
- Mobile-responsive UI

**Quick Setup (local)**

Prerequisites: Node.js (>=18), npm, MongoDB (local or cloud).

1. Clone repository

```bash
# already in workspace if you have it locally
cd astu_smart_campus_safety
```

2. Install dependencies

```bash
# Frontend / root app
npm install

# Backend
cd backend
npm install
```

3. Environment variables

Create `backend/.env` with the following (example):

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
VOYAGE_API_KEY=your_voyage_key
```

Notes:

- The backend uses Gemini for generation; this project targets `gemini-2.5-flash`.
  
- Voyage (or another embedding provider) is used to generate embeddings. If you don't have Voyage, adapt `backend/services/ragService.ts` to your embedding provider.

4. Run the project

```bash
# Start backend
cd backend
npm run dev
# Start frontend (from project root)
cd ..
npm run dev
```

Frontend will usually run at `http://localhost:5173` (Vite default) and the backend at `http://localhost:5000` (example). Update `services`/`authService.ts` or 

`NEXT_PUBLIC_API_URL` equivalents if needed.

**Development notes**

- RAG pipeline (high level):
  
  - User question -> embedding generated -> vector search in `Document` collection -> top documents injected into prompt -> generative model (Gemini) produces answer.
    
  - `backend/services/ragService.ts` contains the pipeline; it uses `DocumentModel.vectorSearch()` with a fallback to text search.
    
- Chat controller persists conversations and messages (`backend/controllers/chatController.ts`).
  
- Frontend pages are in `/pages` and share UI constants and `Icons` in `constants.tsx`.

**Testing & Debugging**

- Check console logs for helpful messages from the RAGService and vector search.
  
- If answers are repeated or static, ensure:
  
  - `GEMINI_API_KEY` is set and valid.
    
  - Embeddings are present on documents (run upload flow to create chunks and embeddings).
    
  - `VOYAGE_API_KEY` is set or reconfigure embedding provider.

**Deployment tips**

- Use a managed MongoDB (Atlas) with Vector Search enabled or a dedicated vector store (Pinecone, Weaviate).
  
- Store secrets (GEMINI_API_KEY, VOYAGE_API_KEY, MONGO_URI) in your cloud provider's secret store.
  
- Use a production process manager (PM2) or containerize the backend.

**Useful Commands**

- Start frontend: `npm run dev`
  
- Start backend: `cd backend && npm run dev`
  
- Build frontend: `npm run build`

**Where to look in the repo**

- Backend: `backend/` — API, controllers, services, models
  
- Frontend pages: `pages/` — `LandingPage.tsx`, `ChatPage.tsx`, etc.
  
- RAG entrypoint: `backend/services/ragService.ts`

### 📸 Screenshots / Pages 

### landing page

<img width="1722" height="1908" alt="image" src="https://github.com/user-attachments/assets/b405514c-dcb3-47f9-9ab4-f30dd8a6538f" />

### sign up page

<img width="1722" height="1456" alt="image" src="https://github.com/user-attachments/assets/53fd2a78-153b-45ce-84ae-a0cd69bb1fb5" />

### login page

<img width="1722" height="1302" alt="image" src="https://github.com/user-attachments/assets/fac6d10e-161a-4ab3-8df5-2d504949db20" />

### chatbot image

<img width="1272" height="851" alt="image" src="https://github.com/user-attachments/assets/a5115bc7-dca6-4993-a4d2-760026a20260" />

### student dashboard

<img width="1892" height="858" alt="image" src="https://github.com/user-attachments/assets/58a28a9e-efae-4694-b61d-be7476fe4cec" />



