@echo off
title PUBLICADOR AUTOMATICO AFEMEC - CLOUD
color 0B
cls
echo.
echo ==============================================================================
echo   AUTOPUBLICADOR DE TORNEOS AFEMEC (EDICION NUBE)
echo ==============================================================================
echo.
echo   Este script preparara todo para que el sistema este online 24/7.
echo.
echo   PASOS:
echo   1. Se instalara una herramienta llamada 'Railway' (si no la tienes).
echo   2. Te pedira entrar a tu navegador para autorizar (un clic).
echo   3. El sistema se subira solo y te dara el link final.
echo.
echo   Presiona una tecla para COMENZAR el proceso...
pause >nul

echo.
echo [1/3] Verificando archivos...
if not exist "server_unificado.js" (
    echo ERROR: No se encuentra server_unificado.js
    pause
    exit
)

echo [2/3] Iniciando sesion en la nube (Se abrira tu navegador)...
npx -y railway login

echo.
echo [3/3] Subiendo sistema a internet...
npx -y railway link
npx -y railway up

echo.
echo ==============================================================================
echo   SI TODO SALIO BIEN, YA TIENES TU LINK EN LA PANTALLA
echo ==============================================================================
echo.
pause
