@echo off
title COMPARTIR (CONTRASENA AUTOMATICA)
cls
color 0B

echo.
echo ==============================================================================
echo   PASO 1: OBTENER LA CONTRASENA
echo ==============================================================================
echo.
echo   Para abrir el enlace en tu celular, te pedira una PASSWORD.
echo   Esa password es TU IP PUBLICA.
echo.
echo   [ACCION]
echo   Voy a abrir una pagina web que te mostrara esa IP (Password).
echo   copiala.
echo.
echo   Presiona una tecla para abrir la pagina de la password...
pause >nul
start https://loca.lt/mytunnelpassword

echo.
echo   ¿Ya viste la IP en la pagina web? (Ej: 181.x.x.x)
echo   ANOTALA.
echo.
echo ==============================================================================
echo   PASO 2: GENERAR EL ENLACE
echo ==============================================================================
echo.
echo   Ahora generaremos el enlace para tu celular.
echo.
echo   INSTRUCCIONES FINALES:
echo   1. Entra al enlace que te dara abajo (your url is...).
echo   2. Cuando te pida "Tunnel Password", pon la IP que acabas de ver.
echo   3. Dale a "Click to Submit".
echo.
echo   Presiona una tecla para continuar...
pause >nul

call npx localtunnel --port 3000
pause
