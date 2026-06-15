FROM python:3.12-slim

# Install system dependencies for OpenCV, Tesseract OCR, and FFmpeg
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "Main:app", "--host", "0.0.0.0", "--port", "8000"]
