@echo off
title GENERADOR DE LINK PUBLICO - AFEMEC
color 0A
cls
echo.
echo ==============================================================================
echo   GENERANDO LINK DE INTERNET PARA RESULTADOS...
echo ==============================================================================
echo.
echo   [IMPORTANTE]
echo   1. Deja esta ventana abierta mientras quieras que el link funcione.
echo   2. El link que aparezca abajo es el que debes enviar por WhatsApp.
echo.
echo ------------------------------------------------------------------------------
echo.

:: Iniciar el tunnel de Cloudflare directamente a la web de resultados
cloudflared.exe tunnel --url http://localhost:3000

echo.
echo ==============================================================================
echo   Si cerraste la ventana, el link dejara de funcionar.
echo ==============================================================================
pause
