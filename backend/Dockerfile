FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements whether build context is repo root or ./backend
COPY requirements.txt* backend/requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .
# If context was root, normalize app directory structure
RUN if [ -d "backend" ]; then cp -r backend/* . && rm -rf backend; fi

EXPOSE 8000 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Bind dynamically to $PORT (Render sets $PORT=10000, local Docker defaults to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
