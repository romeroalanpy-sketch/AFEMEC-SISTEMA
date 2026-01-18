# Guía de Publicación en Render (AFEMEC) 🚀

Para que tu sistema esté online 24/7 con un link profesional y sin que se borren los datos, sigue estos pasos:

## 1. Preparar los archivos
Ejecuta el archivo `PREPARAR_PARA_RENDER.bat`. Esto creará un archivo llamado `AFEMEC_PARA_RENDER.zip`.

## 2. Subir a GitHub (Recomendado)
Render funciona mejor conectando una cuenta de GitHub.
1. Crea un repositorio en GitHub (puedes llamarlo `afemec-sistema`).
2. Sube el contenido del ZIP (o la carpeta del proyecto) a ese repositorio.

## 3. Crear el servicio en Render
1. Ve a [dashboard.render.com](https://dashboard.render.com).
2. Haz clic en **New +** > **Web Service**.
3. Selecciona tu repositorio de GitHub.
4. Configura estos campos:
   - **Name:** `afemec-torneos` (o el que quieras)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (o el que prefieras)

## 4. Persistencia de Datos (¡MUY IMPORTANTE!) 💾
Como usamos SQLite, si usas el plan **Gratis**, los datos se borrarán cada vez que el servidor se reinicie. Para evitar esto:

### Opción A: Mantener datos (Plan de Pago - Recomendado)
1. En la pestaña **Settings** de tu servicio en Render, busca **Disks**.
2. Haz clic en **Add Disk**.
3. Configura:
   - **Name:** `database-disk`
   - **Mount Path:** `/data`
   - **Size:** `1GB` es suficiente.
4. Esto hará que tus bases de datos Senior, Master y Ejecutivo sean permanentes.

### Opción B: Plan Gratis (Los datos se reinician)
Si usas el plan gratis sin disco, los cambios que hagas en los equipos o resultados se perderán cuando Render apague el servidor por inactividad.

---
### Links Útiles
- Link de administración: `https://tu-app.onrender.com/`
- Link para público: `https://tu-app.onrender.com/index.html?mode=public`
