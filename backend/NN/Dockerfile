# 1️⃣ Используем базовый образ Python
FROM python:3.10-slim

# 2️⃣ Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# 3️⃣ Копируем зависимости
COPY requirements.txt .

# 4️⃣ Устанавливаем библиотеки
RUN pip install --no-cache-dir -r requirements.txt

# 5️⃣ Копируем всё содержимое проекта
COPY . .

# 6️⃣ Указываем команду запуска FastAPI
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
