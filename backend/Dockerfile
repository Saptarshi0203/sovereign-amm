FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for native python extensions
RUN apt-get update && apt-get install -y build-essential curl

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install redis passlib[argon2]

# Copy application source
COPY . .

# Run Uvicorn
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
