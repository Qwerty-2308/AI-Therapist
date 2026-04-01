# SereNova AI Service

Python-based AI service using Google's Gemma model or Ollama, integrated with the Java/Spring Boot backend.

## Architecture

```
Frontend (React) → Java Backend (Spring Boot) → Python AI Service → AI Model
                                                                  ├── Gemma (Google)
                                                                  └── Ollama (local)
```

## Setup

### 1. Install Python Dependencies

```bash
cd backend/python
pip install -r requirements.txt
```

### 2. Install Gemma (optional, for Google Gemma model)

```bash
pip install gemma
# Also need JAX: pip install jax jaxlib
```

Or use Ollama (simpler):

```bash
# Install Ollama: https://ollama.ai
ollama pull qwen2.5:latest
```

### 3. Run the AI Service

```bash
cd backend/python
python ai_service.py
```

The service runs on port **5001** by default.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| AI_PROVIDER | "ollama" | "gemma" or "ollama" |
| PORT | 5001 | Service port |
| OLLAMA_MODEL | "qwen2.5:latest" | Ollama model name |
| GEMMA_MODEL | "gemma3_4b" | Gemma model name |

## Running with Java Backend

1. Start the Python AI service first:
   ```bash
   cd backend/python
   python ai_service.py
   ```

2. Start the Java backend (port 8080):
   ```bash
   cd backend
   mvn spring-boot:run
   ```

3. Start the frontend (port 5173):
   ```bash
   cd frontend
   npm run dev
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /chat` - Send message, receive AI response

Request:
```json
{
  "message": "I'm feeling anxious today"
}
```

Response:
```json
{
  "response": "I hear you. It's completely okay to feel anxious sometimes..."
}
```
