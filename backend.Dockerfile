FROM python:3.12-slim
WORKDIR /srv

COPY rafid-engine ./rafid-engine
COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /srv/backend
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev

COPY backend ./
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
