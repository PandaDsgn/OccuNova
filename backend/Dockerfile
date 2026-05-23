FROM python:3.11

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy all the files and models into the container
COPY . .

# Run the FastAPI server on port 7860 (Hugging Face's default port)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
