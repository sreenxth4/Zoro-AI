# Zoro AI

Zoro AI is an AI-powered code generator that turns natural language prompts into formatted code with an explanation. It includes a Flask backend powered by Groq and a browser-based frontend for generating, copying, downloading, and previewing code.

## Highlights

- Generates clean code from natural language prompts.
- Separates generated code from explanations for easier reading.
- Supports copy and download actions for generated output.
- **Implemented a live code preview for HTML/CSS/JS that renders output instantly in-browser without saving files — conceived before mainstream AI tools adopted similar functionality.**
- Keeps API keys out of source control through environment variables.

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap, PrismJS
- Backend: Python, Flask, Flask-CORS
- AI Provider: Groq

## Project Structure

```text
Zoro-AI/
+-- backend/
|   +-- server.py
|   +-- requirements.txt
|   +-- .env
+-- docs/
|   +-- index.html
|   +-- main.css
|   +-- script.js
+-- README.md
```

## Local Setup

1. Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Create `backend/.env` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

3. Start the backend:

```bash
python server.py
```

4. Serve the frontend from the project root:

```bash
python -m http.server 5500 --bind 127.0.0.1 --directory docs
```

5. Open:

```text
http://127.0.0.1:5500/
```

## Environment Variables

Do not commit `.env` files. The repository ignores local environment files by default.

- `GROQ_API_KEY`: Required for code generation.
- `GROQ_MODEL`: Optional. Defaults to `llama-3.3-70b-versatile`.

For deployment, configure these variables in your hosting provider dashboard.

## API

### `GET /`

Health check endpoint.

### `POST /generate`

Request:

```json
{
  "prompt": "Create a responsive navbar"
}
```

Response:

```json
{
  "language": "html",
  "code": "...",
  "explanation": "..."
}
```
