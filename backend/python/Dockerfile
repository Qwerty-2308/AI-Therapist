# Dockerfile for Python AI Service
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_service.py .

ENV OLLAMA_URL=http://host.docker.internal:11434
ENV OLLAMA_MODEL=gemma3:4b
ENV PORT=5001

EXPOSE 5001

CMD ["python", "ai_service.py"]