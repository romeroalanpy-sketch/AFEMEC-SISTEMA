@echo off
title SERVIDOR TORNEO (NO CERRAR)
color 0A
cd /d "%~dp0"

cls
echo =====================================================================
echo    INICIANDO SISTEMA DE TORNEOS AFEMEC
echo =====================================================================
echo.
echo    [PASO 1] Iniciando Base de Datos y Servidor...
echo    [PASO 2] Abriendo navegador...
echo.
echo    IMPORTANTE:
echo    - MANTEN ESTA VENTANA ABIERTA para que el sistema funcione.
echo    - Si la cierras, la pagina dejara de guardar datos.
echo.
echo =====================================================================

start "" "http://localhost:3001/praprueba.html.HTML"
node server.js
pause
