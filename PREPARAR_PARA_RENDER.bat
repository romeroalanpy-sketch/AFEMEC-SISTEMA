@echo off
title PREPARADOR PARA RENDER - AFEMEC
color 0B
cls
echo.
echo ==============================================================================
echo   PREPARANDO PAQUETE PARA RENDER (AFEMEC)
echo ==============================================================================
echo.
echo   Este script creara un archivo ZIP ligero para que lo subas a Render.
echo.

set ZIP_NAME=AFEMEC_PARA_RENDER.zip

if exist %ZIP_NAME% del %ZIP_NAME%

echo [1/2] Limpiando archivos innecesarios...
:: No borramos realmente, solo filtramos en el zip

echo [2/2] Creando archivo ZIP comprimido...
:: Usamos powershell para crear el zip excluyendo node_modules y ejecutables pesados
powershell -Command "$files = Get-ChildItem -Path . -Exclude 'node_modules', 'cloudflared.exe', '*.zip', '.git', '.gemini'; Compress-Archive -Path $files -DestinationPath '%ZIP_NAME%' -Force"

echo.
echo ==============================================================================
echo   ¡LISTO! Se ha creado el archivo: %ZIP_NAME%
echo ==============================================================================
echo.
echo   INSTRUCCIONES PARA RENDER:
echo   1. Ve a https://dashboard.render.com
echo   2. Crea un nuevo 'Web Service'.
echo   3. Conecta tu repositorio de GitHub (o sube este ZIP si usas un metodo directo).
echo.
echo   [IMPORTANTE] Configuracion en Render:
echo   - Runtime: Node
echo   - Build Command: npm install
echo   - Start Command: npm start
echo.
echo   Presiona una tecla para cerrar...
pause >nul
