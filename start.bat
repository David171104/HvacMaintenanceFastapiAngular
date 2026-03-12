@echo off
title Iniciando Proyecto Fullstack

echo ===============================
echo Iniciando servidor FastAPI...
echo ===============================
REM Activar entorno virtual
call myvenv\Scripts\activate

REM Iniciar servidor FastAPI
start cmd /k "uvicorn app.app:app --reload --port 8001"

timeout /t 3 > nul

echo ===============================
echo Iniciando servidor Angular...
echo ===============================
start cmd /k "ng serve"

echo ===============================
@REM  start cmd /k "cd iot && uvicorn app:app --reload --host 0.0.0.0 --port 8002"

echo ===============================
echo Ambos servidores fueron iniciados.
echo FastAPI: http://127.0.0.1:8001
echo Angular:  http://localhost:4200
echo ===============================

pause