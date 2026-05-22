# Финтрек

Первая итерация дипломного проекта на тему "Платформа для онлайн учета и управления личными финансами".

## Что входит в текущую версию

- backend на NestJS;
- PostgreSQL в Docker;
- frontend на React + Vite;
- регистрация и вход по JWT;
- создание и просмотр финансовых операций;
- дашборд с балансом, доходами, расходами и категориями;
- современный интерфейс с боковой и верхней навигацией.

## Структура проекта

```text
diplom/
  backend/
  frontend/
  docker-compose.yml
```

## Запуск backend и базы данных

1. Скопируйте `backend/.env.example` в `backend/.env`.
2. Запустите сервисы:

```bash
docker compose up --build
```

Backend будет доступен на `http://localhost:3000/api`.

## Запуск frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:5173`.

## Основные маршруты API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/transactions`
- `POST /api/transactions`

## Следующие шаги для диплома

- бюджетирование по месяцам;
- цели накоплений;
- аналитика и графики;
- экспорт отчетов;
- роли и расширенная безопасность.
