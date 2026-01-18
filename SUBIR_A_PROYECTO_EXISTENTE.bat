@echo off
title SUBIDOR AFEMEC v2
color 0B
cls
echo ==============================================================================
echo   INICIANDO PROCESO DE PUBLICACION (FORZANDO CMD)
echo ==============================================================================
echo.

:: Forzamos el uso de npx.cmd para evitar errores de PowerShell
set NPX_PATH="C:\Program Files\nodejs\npx.cmd"

echo [1/3] Solicitando link de acceso seguro...
call %NPX_PATH% -y @railway/cli login --browserless
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo -- ATENCION --
    echo Si ves un link arriba que dice "railway.app/verify", HACER CLIC EN EL.
)

echo.
echo [2/3] Conectando con proyecto "entusiasta-entusiasmo"...
call %NPX_PATH% -y @railway/cli link --project afcb3c9f-58a3-422e-ad55-56437a326196
if %ERRORLEVEL% NEQ 0 (
    echo No se pudo vincular automaticamente.
)

echo.
echo [3/3] Subiendo sistema...
call %NPX_PATH% -y @railway/cli up
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==============================================================================
    echo   SISTEMA ONLINE EN: entusiasta-entusiasmo.up.railway.app
    echo ==============================================================================
)

echo.
echo Presiona una tecla para terminar...
pause > nul
