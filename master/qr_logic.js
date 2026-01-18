
// --- FUNCIONAMIENTO QR ---
const qrModal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');
const qrLinkText = document.getElementById('qrLinkText');

function showQrModal() {
    qrModal.style.display = "block";

    // Determinar qué URL mostrar
    // 1. Si estamos en un Tunnel (nombre de dominio no es localhost), usar esa URL
    // 2. Si estamos en Localhost, usar la IP Local detectada por el servidor

    let publicUrl = "";
    const currentHost = window.location.hostname;

    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        // Estamos en el PC Host -> Usar IP Local
        finalUrl = `http://${currentLocalIp}:${currentPort}/praprueba.html.HTML`;
        publicUrl = `http://${currentLocalIp}:${currentPort}/publico.html`;
    } else {
        // Estamos en un Tunel o ya en la IP -> Usar la URL actual
        finalUrl = window.location.href;
        publicUrl = window.location.href.replace('praprueba.html.HTML', 'publico.html');
    }

    qrLinkText.innerHTML = `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <strong>Acceso Administrador:</strong><br>
            <code style="display:block; background:#f0f0f0; padding:5px; margin:5px 0; font-size:0.9em;">${finalUrl}</code>
        </div>
        <div>
            <strong>Web Pública de Resultados:</strong><br>
            <a href="${publicUrl}" target="_blank" style="color: #2196F3; word-break: break-all;">${publicUrl}</a>
            
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                <button onclick="copiarLink('${publicUrl}')" style="background: #444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.85em;">📋 Copiar Link</button>
                <button onclick="compartirWhatsApp('${publicUrl}')" style="background: #25D366; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.85em;">💬 WhatsApp</button>
            </div>
        </div>
    `;

    // Generar QR usando API pública (más simple que librería local)
    // api.qrserver.com es rápido y fiable
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(finalUrl)}`;
}

function closeQrModal() {
    qrModal.style.display = "none";
}

function copiarLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert("¡Link copiado al portapapeles! Ya puedes pegarlo en WhatsApp.");
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
}

function compartirWhatsApp(url) {
    const texto = encodeURIComponent(`Hola! Aquí puedes seguir los resultados del torneo en vivo: ${url}`);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
}

// Cerrar al click fuera
window.addEventListener('click', (e) => {
    if (e.target == qrModal) closeQrModal();
});
