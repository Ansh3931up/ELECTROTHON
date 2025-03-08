FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libatlas-base-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only necessary files
COPY requirements.txt .
COPY app.py .
COPY src/ ./src/
COPY templates/ ./templates/
COPY data/shape_predictor/ ./data/shape_predictor/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Expose port
EXPOSE 8080

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]