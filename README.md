# Bank Document Verification - Starter Project

This starter contains a simple backend (Node/Express) and frontend (Vite + React) demo that lets you upload bank documents
and runs basic text extraction heuristics. It's intentionally lightweight so you can run locally quickly.

## Quick start

1. Open two terminals.
2. Start backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend listens on http://localhost:5000
3. Start frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend available at http://localhost:5173
4. Upload an image or PDF from the React UI. The backend will attempt OCR (if tesseract.js is installed) or fallback to a simple filename/binary heuristic.

## Notes & next steps
- For real OCR accuracy, install tesseract.js (add to backend deps) or integrate cloud OCR (Google/ AWS / Azure).
- Add database persistence, encryption for account numbers, IFSC database, and a manual-review/admin UI.
