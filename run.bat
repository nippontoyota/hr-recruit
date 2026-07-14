@echo off
title Nippon Toyota Recruitment Portal - Startup Script

echo ===================================================
echo Starting Backend Setup and Server...
echo ===================================================

cd backend

:: Run database migrations
echo Running migrations...
call .\venv\Scripts\alembic.exe upgrade head

:: Seed users
echo Seeding default users...
call .\venv\Scripts\python.exe -m scripts.seed_users

:: Start backend in a new command prompt window
echo Starting backend server...
start "Recruitment Portal - Backend" cmd /k ".\venv\Scripts\uvicorn.exe app.main:app --reload"

cd ..

echo ===================================================
echo Starting Frontend Server...
echo ===================================================

cd frontend

:: Install frontend dependencies
echo Checking frontend dependencies...
call npm install

:: Start frontend in a new command prompt window
echo Starting frontend dev server...
start "Recruitment Portal - Frontend" cmd /k "npm run dev"

cd ..

echo ===================================================
echo Done! Both backend and frontend are starting.
echo ===================================================
pause
