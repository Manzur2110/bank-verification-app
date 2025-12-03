# Backend (Node/Express) - Bank Document Verification (starter)

## Setup
- Node.js (v16+ recommended)
- Install dependencies:
  ```bash
  cd backend
  npm install
  ```

## Run
  ```bash
  npm start
  ```

The backend listens on port 5000 by default.
It exposes:
- POST /api/v1/uploads  (multipart form, field name `file`)
- GET  /api/v1/uploads/:id
- GET  /api/health
