
// --- CONFIGURACIÓN DE LA API ---
// URL base para conectar con el servidor backend (Node.js)
// Usamos una ruta relativa para que funcione tanto en localhost como desde otros dispositivos en la red
const API_URL = 'api';

// --- ESTADO GLOBAL ---
// Variables para almacenar los datos cargados desde la base de datos
let equipos = [];
let partidos = [];
let goleadores = []; // Se calculará dinámicamente basado en los partidos

// --- ELEMENTOS DEL DOM (INTERFAZ) ---
// Formularios
const ligaNameForm = document.getElementById('ligaNameForm');
const teamForm = document.getElementById('teamForm');
const matchForm = document.getElementById('matchForm');
const addPlayerForm = document.getElementById('addPlayerForm'); // Dentro del modal

// Tablas y Contenedores
const teamsTable = document.getElementById('teamsTable');
const matchesTable = document.getElementById('matchesTable');
const standingsTable = document.getElementById('standingsTable');
const scorersTable = document.getElementById('scorersTable');
const cardsTable = document.getElementById('cardsTable');
const squadAContainer = document.getElementById('squadAContainer');
const squadBContainer = document.getElementById('squadBContainer');
const allPlayersContainer = document.getElementById('allPlayersContainer');

// Elementos de Selección
const matchASelect = document.getElementById('matchA');
const matchBSelect = document.getElementById('matchB');

// Elementos Varios
const ligaTitle = document.getElementById('ligaTitle');
const ligaNameInput = document.getElementById('ligaName');

// Modal
const playerModal = document.getElementById('playerModal');
const modalTeamId = document.getElementById('modalTeamId');
const modalTeamName = document.getElementById('modalTeamName');
const playersList = document.getElementById('playersList');

// --- ESTRUCTURA DE TABS (ELIMINADO A PEDIDO DEL USUARIO) ---
// Todo vuelve a estar en una sola página.

async function eliminarJugador(id) {
    if (!confirm("¿Deseas eliminar a este jugador permanentemente?")) return;
    try {
        await fetch(`${API_URL}/players/${id}`, { method: 'DELETE' });
        loadData(); // Recargar todo
    } catch (e) {
        alert("Error al eliminar jugador");
    }
}
window.eliminarJugador = eliminarJugador;

// --- INICIALIZACIÓN ---

// Evento para guardar el nombre de la liga
ligaNameForm.onsubmit = async function (e) {
    e.preventDefault();
    const nuevoNombre = ligaNameInput.value.trim() || "Sistema de Liga de Fútbol";

    try {
        await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ league_name: nuevoNombre })
        });
        ligaTitle.textContent = nuevoNombre;
    } catch (e) {
        console.error(e);
        alert("Error al guardar el nombre de la liga.");
    }
};

// 2. Función Principal para Cargar Datos
let currentLocalIp = 'localhost';
let currentPort = 3000;
let allPlayers = []; // Cache global de todos los jugadores

async function loadData() {
    try {
        // 1. Cargar Nombre de la Liga y Local IP desde la API
        const resSettings = await fetch(`${API_URL}/settings`);
        if (resSettings.ok) {
            const settings = await resSettings.json();
            if (settings.league_name) {
                ligaTitle.textContent = settings.league_name;
                ligaNameInput.value = settings.league_name;
            }
            if (settings.local_ip) {
                currentLocalIp = settings.local_ip;
                currentPort = settings.port || 3000;
            }
        }

        // Cargar equipos desde la API
        const resTeams = await fetch(`${API_URL}/teams`);
        equipos = await resTeams.json();

        // Cargar TODOS los jugadores para referencia
        const resAllPlayers = await fetch(`${API_URL}/players/all`);
        allPlayers = await resAllPlayers.json();

        // Cargar partidos desde la API
        const resMatches = await fetch(`${API_URL}/matches`);
        partidos = await resMatches.json();

        // Recalcular estadísticas (Goleadores, Posiciones, Tarjetas)
        recalcularGoleadores();

        // Actualizar la interfaz (Tablas y Selects)
        actualizarTablaEquipos();
        actualizarSelectsEquipos();
        actualizarTablaPartidos();
        actualizarTablaPosiciones();
        actualizarTablaGoleadores();
        actualizarTablaTarjetas();
        renderPlayerList(); // Renderizar lista estilo Excel

    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
}

// Ejecutar carga inicial
loadData();

// --- LÓGICA DE CÁLCULO (ESTADÍSTICAS) ---

// Calcular lista de goleadores basada en los partidos jugados
function recalcularGoleadores() {
    goleadores = [];
    partidos.forEach(p => {
        // p.scorersA y p.scorersB son arrays de nombres de jugadores
        if (p.scorersA) p.scorersA.forEach(nombre => agregarGol(nombre, p.equipoA));
        if (p.scorersB) p.scorersB.forEach(nombre => agregarGol(nombre, p.equipoB));
    });
}

function agregarGol(nombre, nombreEquipo) {
    // Buscar si el jugador ya está en la lista de goleadores
    let jug = goleadores.find(j => j.nombre.toLowerCase() === nombre.toLowerCase() && j.equipo === nombreEquipo);

    // Buscar info extendida (camiseta) en allPlayers
    // Buscamos coincidencia por nombre y equipo (join logic simple)
    const playerInfo = allPlayers.find(p => p.name.toLowerCase() === nombre.toLowerCase() && p.team_name === nombreEquipo);
    const jersey = playerInfo ? playerInfo.jersey_number : null;

    if (jug) {
        jug.goles++;
    } else {
        goleadores.push({ nombre, equipo: nombreEquipo, goles: 1, jersey });
    }
}

// --- LISTADO DE JUGADORES (EXCEL STYLE) ---
async function togglePlayerStatus(playerId, field, currentValue) {
    const newValue = currentValue === 1 ? 0 : 1;
    try {
        const response = await fetch(`${API_URL}/players/${playerId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value: newValue })
        });
        if (response.ok) {
            // Actualizar cache local para evitar recarga completa si es posible, 
            // pero para consistencia recargamos los datos
            loadData();
        }
    } catch (e) {
        console.error("Error updating player status", e);
    }
}
window.togglePlayerStatus = togglePlayerStatus;

async function exportTeamPlanilla(teamName) {
    const players = allPlayers.filter(p => p.team_name === teamName);
    if (players.length === 0) return alert("No hay jugadores en este equipo.");

    const tableRows = players.map(p => {
        const estaSancionado = (p.inscripcion === 1 || p.amarilla === 1 || p.roja === 1);
        const obsText = estaSancionado ? 'NO HABILITADO' : 'HABILITADO';
        return `
            <tr>
                <td style="border:1px solid #aaa; padding:10px; text-align:center; font-size:12px;">${p.jersey_number || '-'}</td>
                <td style="border:1px solid #aaa; padding:10px; text-align:left; font-size:12px;">
                    <div style="font-weight:bold;">${p.name.toUpperCase()}</div>
                    <div style="font-size:10px; color:#666;">C.I.: ${p.cedula || '-'}</div>
                </td>
                <td style="border:1px solid #aaa; padding:10px; text-align:center; font-size:16px;">${p.inscripcion ? '●' : ''}</td>
                <td style="border:1px solid #aaa; padding:10px; text-align:center; font-size:16px;">${p.amarilla ? '●' : ''}</td>
                <td style="border:1px solid #aaa; padding:10px; text-align:center; font-size:16px;">${p.roja ? '●' : ''}</td>
                <td style="border:1px solid #aaa; padding:10px; text-align:center; font-weight:bold; color:${estaSancionado ? '#d32f2f' : '#2e7d32'}; font-size:10px;">${obsText}</td>
                <td style="border:1px solid #aaa; padding:10px; text-align:center; width:120px; color:#ddd;">________________</td>
            </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Planilla Oficial - ${teamName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
                body { font-family: 'Roboto', sans-serif; padding: 40px; line-height: 1.4; color: #333; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #d32f2f; padding-bottom: 15px; margin-bottom: 25px; }
                .logo-area { display: flex; align-items: center; gap: 15px; }
                .logo-text { font-size: 38px; font-weight: 900; color: #1a237e; letter-spacing: -1px; }
                .logo-text span { color: #d32f2f; }
                .assoc { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; }
                .title-area { text-align: right; }
                .main-title { margin:0; color:#1a237e; font-size: 24px; font-weight: 900; }
                .info-bar { display: flex; justify-content: space-between; background: #f8f9fa; padding: 15px; border: 2px solid #1a237e; border-radius: 8px; margin-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                th { background: #1a237e; color: white; padding: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; border: 1px solid #1a237e; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                .footer-signatures { margin-top: 60px; display: flex; justify-content: space-around; }
                .sig-box { text-align: center; width: 45%; }
                .sig-line { border-top: 2px solid #333; margin-bottom: 8px; width: 100%; }
                .sig-label { font-size: 12px; font-weight: 700; color: #1a237e; }
                .legalese { text-align: center; font-size: 10px; color: #d32f2f; margin-top: 40px; font-style: italic; font-weight: 700; border-top: 1px dashed #ccc; padding-top: 20px; }
                @page { size: A4; margin: 10mm; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-area">
                    <div>
                        <div class="logo-text">A<span>femec</span></div>
                        <div class="assoc">Asociación de Funcionarios Empleados del MEC</div>
                    </div>
                </div>
                <div class="title-area">
                    <h1 class="main-title">PLANILLA DE JUEGO</h1>
                    <p style="margin:8px 0 0 0; font-size:14px; font-weight:bold; color:#444;">FECHA: ________/________/________</p>
                </div>
            </div>
            
            <div class="info-bar">
                <div><strong style="color:#1a237e;">EQUIPO:</strong> <span style="font-size:18px; font-weight:900; padding: 0 10px; border-bottom: 2px solid #1a237e;">${teamName.toUpperCase()}</span></div>
                <div><strong style="color:#1a237e;">RIVAL:</strong> <span style="font-size:14px; color:#aaa;">___________________________________</span></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="40">N°</th>
                        <th>DATOS DEL JUGADOR</th>
                        <th width="35">I</th>
                        <th width="35">A</th>
                        <th width="35">R</th>
                        <th width="120">ESTADO</th>
                        <th width="150">FIRMA JUGADOR</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>

            <div class="footer-signatures">
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <span class="sig-label">FIRMA DELEGADO RESPONSABLE</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <span class="sig-label">AUTORIZADO / SECRETARÍA AFEMEC</span>
                </div>
            </div>
            
            <div class="legalese">
                * DOCUMENTO OFICIAL AFEMEC - Queda prohibido el ingreso de jugadores sancionados o no registrados.
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    win.document.close();
}
window.exportTeamPlanilla = exportTeamPlanilla;

function renderPlayerList() {
    if (!allPlayersContainer) return;
    allPlayersContainer.innerHTML = "";

    // Agrupar por equipo
    const grouped = {};
    equipos.forEach(t => grouped[t.name] = []);

    allPlayers.forEach(p => {
        if (p.team_name && grouped[p.team_name]) {
            grouped[p.team_name].push(p);
        }
    });

    // Generar tablas
    Object.keys(grouped).forEach(teamName => {
        const players = grouped[teamName];
        if (players.length === 0) return;

        const container = document.createElement('div');
        container.className = 'team-players-container';

        const header = document.createElement('div');
        header.className = 'team-players-header';
        header.innerHTML = `
            <span>🛡️ ${teamName}</span>
            <button class="btn-planilla" onclick="exportTeamPlanilla('${teamName}')">📄 Exportar Planilla</button>
        `;
        container.appendChild(header);

        const table = document.createElement('table');
        table.className = 'excel-table';

        let thead = `
            <thead>
                <tr>
                    <th width="30">#</th>
                    <th>Nombre Completo</th>
                    <th width="85">F. Nacim.</th>
                    <th width="80">Cédula</th>
                    <th width="80">Tipo</th>
                    <th width="40" class="text-center" title="Inscripción">I</th>
                    <th width="40" class="text-center" title="Amarilla">A</th>
                    <th width="40" class="text-center" title="Roja">R</th>
                    <th width="100" class="text-center">OBS</th>
                    <th width="50" class="text-center">Acción</th>
                </tr>
            </thead>
        `;

        let tbody = '<tbody>';
        players.forEach(p => {
            const jerseyDisplay = p.jersey_number ? `<span class="jersey-badge">${p.jersey_number}</span>` : '<span class="jersey-badge">-</span>';
            const typeClass = p.type ? `type-${p.type}` : '';
            const typeBadge = p.type ? `<span class="type-badge ${typeClass}">${p.type}</span>` : '-';

            // Lógica de observación (OBS)
            const estaSancionado = (p.inscripcion === 1 || p.amarilla === 1 || p.roja === 1);
            const obsText = estaSancionado ? 'NO HABILITADO' : 'HABILITADO';
            const obsClass = estaSancionado ? 'status-no-habilitado' : 'status-habilitado';

            // Status Circles (Inscripción, Amarilla, Roja)
            const getStatusBtn = (field, val) => {
                const activeClass = val === 1 ? 'active' : '';
                const colorClass = field === 'inscripcion' ? 'status-blue' : (field === 'amarilla' ? 'status-yellow' : 'status-red');
                return `<div class="status-circle ${colorClass} ${activeClass}" onclick="togglePlayerStatus(${p.id}, '${field}', ${val || 0})"></div>`;
            };

            // Format Date
            let dob = '-';
            if (p.dob) {
                dob = p.dob.split('-').reverse().join('/');
            }

            tbody += `
                <tr>
                    <td>${jerseyDisplay}</td>
                    <td style="font-weight: 500;">${p.name}</td>
                    <td style="font-size: 0.85em;">${dob}</td>
                    <td style="font-size: 0.85em;">${p.cedula || '-'}</td>
                    <td>${typeBadge}</td>
                    <td class="text-center">${getStatusBtn('inscripcion', p.inscripcion)}</td>
                    <td class="text-center">${getStatusBtn('amarilla', p.amarilla)}</td>
                    <td class="text-center">${getStatusBtn('roja', p.roja)}</td>
                    <td class="text-center">
                        <span class="obs-badge ${obsClass}">${obsText}</span>
                    </td>
                    <td class="text-center">
                        <button onclick="eliminarJugador(${p.id})" style="background:#ff4d4d; border:none; color:white; border-radius:4px; padding:4px 8px; cursor:pointer;" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });
        tbody += '</tbody>';

        table.innerHTML = thead + tbody;
        container.appendChild(table);
        allPlayersContainer.appendChild(container);
    });

    if (Object.keys(grouped).length === 0) {
        allPlayersContainer.innerHTML = "<p>No hay equipos/jugadores registrados.</p>";
    }
}

// --- GESTIÓN DE EQUIPOS ---

// Agregar un nuevo equipo
teamForm.onsubmit = async function (e) {
    e.preventDefault();
    const nombre = document.getElementById('teamName').value.trim();
    const escudo = document.getElementById('teamLogo').value.trim() || "https://placehold.co/32x32";

    if (!nombre) return;

    try {
        const response = await fetch(`${API_URL}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nombre, logo: escudo })
        });

        if (response.ok) {
            await loadData(); // Recargar todo
            teamForm.reset();
        } else {
            alert("Error al crear equipo.");
        }
    } catch (err) {
        console.error(err);
        alert("Error de conexión.");
    }
};

// Eliminar un equipo
async function eliminarEquipo(id) {
    if (!confirm("¿Estás seguro de eliminar este equipo? Se borrarán sus jugadores.")) return;
    try {
        await fetch(`${API_URL}/teams/${id}`, { method: 'DELETE' });
        loadData();
    } catch (e) { alert("Error al eliminar."); }
}

// Renderizar tabla de equipos
function actualizarTablaEquipos() {
    // Limpiar tabla (mantener encabezado)
    while (teamsTable.rows.length > 1) teamsTable.deleteRow(1);

    equipos.forEach((eq, idx) => {
        let row = teamsTable.insertRow();
        row.insertCell(0).textContent = idx + 1;
        row.insertCell(1).textContent = eq.name;
        row.insertCell(2).innerHTML = `<img src="${eq.logo}" width="32" height="32" style="object-fit:contain;">`;

        // Botones de acción
        const celdaAcciones = row.insertCell(3);
        celdaAcciones.innerHTML = `
      <button class="manage-btn" onclick="abrirModalJugadores(${eq.id}, '${eq.name}')">Jugadores</button> 
      <button class="del-btn" onclick="eliminarEquipo(${eq.id})">Eliminar</button>
    `;
    });
}

// --- GESTIÓN DE JUGADORES (MODAL) ---

async function abrirModalJugadores(teamId, teamName) {
    playerModal.style.display = "block";
    modalTeamName.textContent = "Gestionar Jugadores: " + teamName;
    modalTeamId.value = teamId; // Guardar ID del equipo en el input oculto
    await cargarJugadoresEnModal(teamId);
}

function cerrarModalJugadores() {
    playerModal.style.display = "none";
    playersList.innerHTML = "";
}

// Cerrar modal al hacer clic fuera
window.onclick = function (event) {
    if (event.target == playerModal) cerrarModalJugadores();
}

async function cargarJugadoresEnModal(teamId) {
    playersList.innerHTML = "<p>Cargando...</p>";
    try {
        const res = await fetch(`${API_URL}/teams/${teamId}/players`);
        const jugadores = await res.json();
        playersList.innerHTML = "";

        jugadores.forEach(p => {
            const li = document.createElement('li');
            let infoExtra = '';
            if (p.jersey_number) infoExtra += ` (#${p.jersey_number})`;
            if (p.type) infoExtra += ` - ${p.type}`;

            li.innerHTML = `
        <span>${p.name}${infoExtra}</span>
        <!-- Aquí se podría agregar botón para eliminar jugador individualmente -->
      `;
            playersList.appendChild(li);
        });

        if (jugadores.length === 0) {
            playersList.innerHTML = "<p>No hay jugadores registrados en este equipo.</p>";
        }
    } catch (e) {
        playersList.innerHTML = "<p>Error al cargar jugadores.</p>";
    }
}

// Agregar Jugador desde el Modal
addPlayerForm.onsubmit = async function (e) {
    e.preventDefault();
    const teamId = modalTeamId.value;
    const nameInput = document.getElementById('playerName');
    const cedulaInput = document.getElementById('playerCedula');
    const dobInput = document.getElementById('playerDob');
    const typeInput = document.getElementById('playerType');
    const jerseyInput = document.getElementById('playerJersey');

    const name = nameInput.value.trim();
    if (!name) return;

    const payload = {
        name,
        cedula: cedulaInput.value.trim(),
        dob: dobInput.value,
        type: typeInput.value,
        jerseyNumber: jerseyInput.value
    };

    try {
        await fetch(`${API_URL}/teams/${teamId}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Limpiar inputs
        nameInput.value = "";
        cedulaInput.value = "";
        dobInput.value = "";
        jerseyInput.value = "";
        // No limpiamos typeInput para mantener la selección anterior por comodidad

        cargarJugadoresEnModal(teamId); // Recargar lista
    } catch (e) { alert("Error al agregar jugador."); }
}

// --- GESTIÓN DE PARTIDOS ---

// Actualizar los selectores de Equipos A y B
function actualizarSelectsEquipos() {
    // Guardar selección actual si existe
    const valA = matchASelect.value;
    const valB = matchBSelect.value;

    matchASelect.innerHTML = '<option value="">-- Selecciona Equipo A --</option>';
    matchBSelect.innerHTML = '<option value="">-- Selecciona Equipo B --</option>';

    equipos.forEach(eq => {
        const optA = new Option(eq.name, eq.id);
        const optB = new Option(eq.name, eq.id);
        matchASelect.add(optA);
        matchBSelect.add(optB);
    });

    // Restaurar selección si es posible
    if (valA) matchASelect.value = valA;
    if (valB) matchBSelect.value = valB;
}

// Al seleccionar equipos, cargar sus plantillas
matchASelect.addEventListener('change', () => cargarPlantillaPartido(matchASelect.value, squadAContainer, 'A'));
matchBSelect.addEventListener('change', () => cargarPlantillaPartido(matchBSelect.value, squadBContainer, 'B'));

async function cargarPlantillaPartido(teamId, container, prefijo) {
    if (!teamId) {
        container.innerHTML = "<p class='small'>Selecciona un equipo para ver los jugadores.</p>";
        return;
    }

    container.innerHTML = "<p>Cargando plantilla...</p>";

    try {
        const res = await fetch(`${API_URL}/teams/${teamId}/players`);
        const jugadores = await res.json();

        if (jugadores.length === 0) {
            container.innerHTML = "<p>No hay jugadores en este equipo.</p>";
            return;
        }

        // Crear una tabla pequeña para la selección de acciones (goles, tarjetas)
        let html = `
      <table>
        <tr>
          <th>Jugador</th>
          <th title="Goles">⚽</th>
          <th title="Amarilla" style="background:#ffeb3b; color:black;">🟨</th>
          <th title="Roja" style="background:#f44336; color:white;">🟥</th>
        </tr>
    `;

        jugadores.forEach(p => {
            // Usamos data-attributes para identificar inputs fácilmente luego
            html += `
        <tr>
          <td>
            ${p.name}
            <input type="hidden" class="player-name-${prefijo}" data-id="${p.id}" value="${p.name}">
          </td>
          <td>
            <input type="number" min="0" value="0" class="goal-input-${prefijo} small-input" data-id="${p.id}">
          </td>
          <td>
            <input type="checkbox" class="yellow-input-${prefijo}" data-id="${p.id}">
          </td>
          <td>
            <input type="checkbox" class="red-input-${prefijo}" data-id="${p.id}">
          </td>
        </tr>
      `;
        });
        html += `</table>`;
        container.innerHTML = html;

        // Agregar listeners para sumar goles automáticamente al marcador global
        const goalInputs = container.querySelectorAll(`.goal-input-${prefijo}`);
        goalInputs.forEach(input => {
            input.addEventListener('input', () => {
                let total = 0;
                goalInputs.forEach(inp => total += parseInt(inp.value) || 0);
                // Actualizar el input principal del formulario
                if (prefijo === 'A') document.getElementById('scoreA').value = total;
                if (prefijo === 'B') document.getElementById('scoreB').value = total;
            });
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>Error al cargar jugadores.</p>";
    }
}

// Guardar Partido
matchForm.onsubmit = async function (e) {
    e.preventDefault();
    const idA = matchASelect.value;
    const idB = matchBSelect.value;

    if (!idA || !idB) return alert("Debes seleccionar ambos equipos.");
    if (idA === idB) return alert("Un equipo no puede jugar contra sí mismo.");

    // Función auxiliar para extraer datos del formulario dinámico
    const extraerDatosPlantilla = (container, prefijo) => {
        const scorers = [];
        const yellows = [];
        const reds = [];

        if (!container) return { scorers, yellows, reds };

        const goalInputs = container.querySelectorAll(`.goal-input-${prefijo}`);

        goalInputs.forEach(input => {
            const playerId = input.getAttribute('data-id');
            const nombreInput = container.querySelector(`.player-name-${prefijo}[data-id="${playerId}"]`);
            const yellowInput = container.querySelector(`.yellow-input-${prefijo}[data-id="${playerId}"]`);
            const redInput = container.querySelector(`.red-input-${prefijo}[data-id="${playerId}"]`);

            if (nombreInput) {
                const nombre = nombreInput.value;
                const goles = parseInt(input.value) || 0;
                const esAmarilla = yellowInput ? yellowInput.checked : false;
                const esRoja = redInput ? redInput.checked : false;

                // Agregar el nombre tantas veces como goles haya marcado (para el conteo)
                for (let k = 0; k < goles; k++) scorers.push(nombre);

                if (esAmarilla) yellows.push(nombre);
                if (esRoja) reds.push(nombre);
            }
        });
        return { scorers, yellows, reds };
    };

    const datosA = extraerDatosPlantilla(squadAContainer, 'A');
    const datosB = extraerDatosPlantilla(squadBContainer, 'B');

    const payload = {
        equipoA: idA,
        equipoB: idB,
        fecha: document.getElementById('matchDate').value,
        matchDay: parseInt(document.getElementById('matchDay').value, 10) || 1, // Nuevo campo
        scoreA: parseInt(document.getElementById('scoreA').value, 10) || 0,
        scoreB: parseInt(document.getElementById('scoreB').value, 10) || 0,
        scorersA: datosA.scorers,
        scorersB: datosB.scorers,
        yellowsA: datosA.yellows,
        yellowsB: datosB.yellows,
        redsA: datosA.reds,
        redsB: datosB.reds
    };

    try {
        const res = await fetch(`${API_URL}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await loadData(); // Recargar datos
            matchForm.reset();
            squadAContainer.innerHTML = "Selecciona un equipo.";
            squadBContainer.innerHTML = "Selecciona un equipo.";
            // Reiniciar fecha a 1 por defecto tras guardar
            document.getElementById('matchDay').value = 1;
        } else {
            alert("Error al guardar el partido.");
        }
    } catch (e) { alert(e.message); }
};

// Eliminar Partido
async function eliminarPartido(id) {
    if (!confirm("¿Eliminar este partido?")) return;
    try {
        await fetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
        loadData();
    } catch (e) { alert(e.message); }
}

// Renderizar tabla de partidos
function actualizarTablaPartidos() {
    while (matchesTable.rows.length > 1) matchesTable.deleteRow(1);

    partidos.forEach((pt) => {
        let row = matchesTable.insertRow();

        // Nombres de equipos vienen del JOIN en el backend
        row.insertCell(0).textContent = pt.equipoA || "Equipo Eliminado";
        row.insertCell(1).textContent = pt.equipoB || "Equipo Eliminado";

        // Formatear fecha + número de fecha si existe
        const fecha = new Date(pt.date || pt.fecha);
        let infoFecha = fecha.toLocaleString();
        if (pt.match_day) infoFecha = `Fecha ${pt.match_day} - ${infoFecha}`;

        row.insertCell(2).textContent = infoFecha;

        row.insertCell(3).textContent = `${pt.score_a} - ${pt.score_b}`;

        // Formatear Goleadores (Arrays de nombres)
        let sA = (pt.scorersA || []).join(", ");
        let sB = (pt.scorersB || []).join(", ");
        if (!sA) sA = "-";
        if (!sB) sB = "-";
        row.insertCell(4).innerHTML = `<strong>A:</strong> ${sA}<br><strong>B:</strong> ${sB}`;

        // Acciones
        row.insertCell(5).innerHTML = `<button class="del-btn" onclick="eliminarPartido(${pt.id})">Eliminar</button>`;
    });
}

// --- TABLA DE POSICIONES ---

function actualizarTablaPosiciones() {
    // Inicializar estructura para cálculo
    // Nota: Usamos 'equipos' para asegurar que todos aparezcan, incluso si no han jugado.
    const tabla = equipos.map(eq => ({
        nombre: eq.name,
        PJ: 0, // Partidos Jugados
        PG: 0, // Ganados
        PE: 0, // Empatados
        PP: 0, // Perdidos
        GF: 0, // Goles a Favor
        GC: 0, // Goles en Contra
        DG: 0, // Diferencia de Goles
        PTS: 0 // Puntos
    }));

    // Procesar cada partido
    partidos.forEach(pt => {
        // Buscar los equipos en la tabla auxiliar
        let eqA = tabla.find(x => x.nombre === pt.equipoA);
        let eqB = tabla.find(x => x.nombre === pt.equipoB);

        // Si los equipos existen (no fueron eliminados), sumamos stats
        if (eqA && eqB) {
            eqA.PJ++;
            eqB.PJ++;

            eqA.GF += pt.score_a;
            eqA.GC += pt.score_b;

            eqB.GF += pt.score_b;
            eqB.GC += pt.score_a;

            if (pt.score_a > pt.score_b) {
                eqA.PG++;
                eqB.PP++;
                eqA.PTS += 3; // 3 puntos por ganar
            } else if (pt.score_a < pt.score_b) {
                eqB.PG++;
                eqA.PP++;
                eqB.PTS += 3;
            } else {
                // Empate
                eqA.PE++;
                eqB.PE++;
                eqA.PTS += 1; // 1 punto por empatar
                eqB.PTS += 1;
            }
        }
    });

    // Calcular diferencia de goles
    tabla.forEach(eq => {
        eq.DG = eq.GF - eq.GC;
    });

    // Ordenar: Mayores Puntos > Mayor DG > Mayor GF
    tabla.sort((a, b) => b.PTS - a.PTS || b.DG - a.DG || b.GF - a.GF);

    // Renderizar
    while (standingsTable.rows.length > 1) standingsTable.deleteRow(1);

    tabla.forEach(eq => {
        let row = standingsTable.insertRow();
        row.insertCell(0).textContent = eq.nombre;
        row.insertCell(1).textContent = eq.PJ;
        row.insertCell(2).textContent = eq.PG;
        row.insertCell(3).textContent = eq.PE;
        row.insertCell(4).textContent = eq.PP;
        row.insertCell(5).textContent = eq.GF;
        row.insertCell(6).textContent = eq.GC;
        row.insertCell(7).textContent = eq.DG;
        row.insertCell(8).innerHTML = `<strong>${eq.PTS}</strong>`;
    });
}

// --- RANKING DE GOLEADORES ---

function actualizarTablaGoleadores() {
    while (scorersTable.rows.length > 1) scorersTable.deleteRow(1);

    // Ordenar por cantidad de goles
    goleadores.sort((a, b) => b.goles - a.goles);

    goleadores.forEach((j, i) => {
        let row = scorersTable.insertRow();
        row.insertCell(0).textContent = i + 1;

        let nameDisplay = j.nombre;
        if (j.jersey) nameDisplay += ` (#${j.jersey})`;

        row.insertCell(1).textContent = nameDisplay;
        row.insertCell(2).textContent = j.equipo;
        row.insertCell(3).textContent = j.goles;
    });
}

// --- RESUMEN DE TARJETAS ---

// --- RESUMEN DE TARJETAS (CONTROL DE SANCIONES) ---
async function limpiarSancion(playerId) {
    if (!confirm("¿Marcar sanción como cumplida? El jugador desaparecerá de este resumen.")) return;
    try {
        // Limpiar amarilla
        await fetch(`${API_URL}/players/${playerId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'amarilla', value: 0 })
        });
        // Limpiar roja
        await fetch(`${API_URL}/players/${playerId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'roja', value: 0 })
        });
        loadData(); // Recargar para actualizar tablas
    } catch (e) {
        console.error(e);
    }
}
window.limpiarSancion = limpiarSancion;

function actualizarTablaTarjetas() {
    // Ahora mostramos los jugadores que TIENEN activa la marca en el listado general
    const jugadoresSancionados = allPlayers.filter(p => p.amarilla === 1 || p.roja === 1);

    // Renderizar
    while (cardsTable.rows.length > 1) cardsTable.deleteRow(1);

    jugadoresSancionados.forEach(j => {
        let row = cardsTable.insertRow();
        row.insertCell(0).textContent = j.name;
        row.insertCell(1).textContent = j.team_name;
        row.insertCell(2).innerHTML = j.amarilla ? '<span style="color: #fbc02d; font-size: 1.5em;">●</span>' : '-';
        row.insertCell(3).innerHTML = j.roja ? '<span style="color: #d32f2f; font-size: 1.5em;">●</span>' : '-';

        const celdaAccion = row.insertCell(4);
        celdaAccion.className = "text-center";
        celdaAccion.innerHTML = `
            <button onclick="limpiarSancion(${j.id})" title="Aprobar / Cumplido" style="background: #27ae60; padding: 5px 10px; margin-right: 5px;">✅</button>
            <button onclick="alert('Este jugador tiene sanciones pendientes.')" title="Pendiente / En falta" style="background: #e74c3c; padding: 5px 10px;">❌</button>
        `;
    });

    if (jugadoresSancionados.length === 0) {
        let row = cardsTable.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 5;
        cell.textContent = "No hay jugadores con sanciones pendientes.";
        cell.style.textAlign = "center";
        cell.style.padding = "20px";
    }
}

// --- EXPORTAR A PDF ---
// Requiere la librería jsPDF cargada en el HTML
// --- EXPORTAR A PDF (Mejorado con html2pdf) ---
function exportPDF() {
    // 1. Preparar datos
    const reportContainer = document.getElementById('pdfReport');
    const element = reportContainer.querySelector('.report-page');

    // Título
    document.getElementById('reportTournamentName').textContent = ligaTitle.textContent.toUpperCase();

    // Determinar la última fecha registrada para el título del subtítulo
    let ultimaFechaNum = 0;
    if (partidos.length > 0) {
        ultimaFechaNum = Math.max(...partidos.map(p => p.match_day || 0));
    }
    const reportSubtitle = document.getElementById('reportSubtitle');
    reportSubtitle.textContent = ultimaFechaNum > 0 ? `INFORME DE LA FECHA ${ultimaFechaNum}` : "INFORME GENERAL";

    // --- Llenar Resultados (Partidos de la Jornada Actual) ---
    const tbodyMatches = document.getElementById('reportMatches').querySelector('tbody');
    tbodyMatches.innerHTML = "";

    // Filtrar para mostrar solo los partidos de la fecha que indica el informe
    const partidosDeLaFecha = partidos.filter(p => (p.match_day || 0) === ultimaFechaNum);

    partidosDeLaFecha.forEach(pt => {
        let row = `<tr>
            <td>${pt.equipoA}</td>
            <td style="font-weight:bold;">${pt.score_a}</td>
            <td style="font-size: 0.8em; color: #777;">VS</td>
            <td>${pt.equipoB}</td>
            <td style="font-weight:bold;">${pt.score_b}</td>
        </tr>`;
        tbodyMatches.insertAdjacentHTML('beforeend', row);
    });

    // Mostrar la sección solo si hay resultados disponibles para esa fecha
    document.getElementById('sectionMatches').style.display = partidosDeLaFecha.length > 0 ? 'block' : 'none';

    // --- Llenar Posiciones ---
    const tbodyStandings = document.getElementById('reportStandings').querySelector('tbody');
    tbodyStandings.innerHTML = "";
    // Reutilizamos la lógica de 'actualizarTablaPosiciones' pero accediendo a los datos ya procesados si fuera posible.
    // Como no guardamos la 'tabla' procesada globalmente, la recalculamos rápido aquí.

    // Copia exacta de lógica de cálculo de posiciones
    const tabla = equipos.map(eq => ({
        nombre: eq.name,
        PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DG: 0, PTS: 0
    }));

    partidos.forEach(pt => {
        let eqA = tabla.find(x => x.nombre === pt.equipoA);
        let eqB = tabla.find(x => x.nombre === pt.equipoB);
        if (eqA && eqB) {
            eqA.PJ++; eqB.PJ++;
            eqA.GF += pt.score_a; eqA.GC += pt.score_b;
            eqB.GF += pt.score_b; eqB.GC += pt.score_a;
            if (pt.score_a > pt.score_b) { eqA.PG++; eqB.PP++; eqA.PTS += 3; }
            else if (pt.score_a < pt.score_b) { eqB.PG++; eqA.PP++; eqB.PTS += 3; }
            else { eqA.PE++; eqB.PE++; eqA.PTS += 1; eqB.PTS += 1; }
        }
    });
    tabla.forEach(eq => eq.DG = eq.GF - eq.GC);
    tabla.sort((a, b) => b.PTS - a.PTS || b.DG - a.DG || b.GF - a.GF);

    tabla.forEach((eq, idx) => {
        let row = `<tr>
            <td>${idx + 1}</td>
            <td style="text-align:left; padding-left:10px;">${eq.nombre.toUpperCase()}</td>
            <td>${eq.PJ}</td>
            <td>${eq.PG}</td>
            <td>${eq.PE}</td>
            <td>${eq.PP}</td>
            <td>${eq.GF}</td>
            <td>${eq.GC}</td>
            <td>${eq.DG}</td>
            <td style="font-weight:bold;">${eq.PTS}</td>
        </tr>`;
        tbodyStandings.insertAdjacentHTML('beforeend', row);
    });

    // --- Llenar Goleadores (Total) ---
    const tbodyScorers = document.getElementById('reportScorers').querySelector('tbody');
    tbodyScorers.innerHTML = "";
    // Ordenar goleadores global
    const sortedScorers = [...goleadores].sort((a, b) => b.goles - a.goles).slice(0, 15); // Top 15
    sortedScorers.forEach((j, i) => {
        let row = `<tr>
            <td>${i + 1}</td>
            <td>${j.nombre.toUpperCase()}</td>
            <td>${j.equipo.toUpperCase()}</td>
            <td style="font-weight:bold;">${j.goles}</td>
        </tr>`;
        tbodyScorers.insertAdjacentHTML('beforeend', row);
    });

    // --- Llenar Tarjetas (Amarillas y Rojas ACTIVAS) ---
    const tbodyYellows = document.getElementById('reportYellows').querySelector('tbody');
    const tbodyReds = document.getElementById('reportReds').querySelector('tbody');
    tbodyYellows.innerHTML = "";
    tbodyReds.innerHTML = "";

    // Filtramos jugadores que tienen tarjetas activas en su ficha
    const yellowsActivas = allPlayers.filter(p => p.amarilla === 1);
    const redsActivas = allPlayers.filter(p => p.roja === 1);

    yellowsActivas.forEach((t, i) => {
        tbodyYellows.insertAdjacentHTML('beforeend', `<tr><td>${i + 1}</td><td>${t.name.toUpperCase()}</td><td>${t.team_name.toUpperCase()}</td></tr>`);
    });
    redsActivas.forEach((t, i) => {
        tbodyReds.insertAdjacentHTML('beforeend', `<tr><td>${i + 1}</td><td>${t.name.toUpperCase()}</td><td>${t.team_name.toUpperCase()}</td></tr>`);
    });

    // --- Goleadores de la Jornada (Filtrados por la fecha actual) ---
    const tbodyJornada = document.getElementById('reportMatchdayScorers').querySelector('tbody');
    tbodyJornada.innerHTML = "";

    if (partidosDeLaFecha.length > 0) {
        const jornadaScorers = [];
        partidosDeLaFecha.forEach(m => {
            const add = (list, eq) => {
                if (!list) return;
                list.forEach(name => {
                    let existing = jornadaScorers.find(x => x.name === name && x.team === eq);
                    if (existing) existing.goals++;
                    else jornadaScorers.push({ name, team: eq, goals: 1 });
                });
            };
            add(m.scorersA, m.equipoA);
            add(m.scorersB, m.equipoB);
        });

        jornadaScorers.sort((a, b) => b.goals - a.goals);
        jornadaScorers.forEach((j, i) => {
            tbodyJornada.insertAdjacentHTML('beforeend', `<tr><td>${i + 1}</td><td>${j.name.toUpperCase()}</td><td>${j.team.toUpperCase()}</td><td>${j.goals}</td></tr>`);
        });
    }

    // 2. Generar PDF
    // Hacemos visible el contenedor temporalmente
    reportContainer.style.display = 'block';

    const opt = {
        margin: 0, // Sin margen, controlamos con padding css
        filename: 'Informe_Torneo_Afemec.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Usamos html2pdf
    html2pdf().set(opt).from(element).save().then(() => {
        // Ocultar de nuevo al finalizar
        reportContainer.style.display = 'none';

        // Notificar sincronización
        const aviso = document.createElement('div');
        aviso.style = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#2c3e50; color:white; padding:15px 25px; border-radius:30px; z-index:9999; box-shadow:0 5px 15px rgba(0,0,0,0.3); font-weight:bold; animation: fadeInOut 4s forwards;';
        aviso.innerHTML = '✅ PDF Generado y Web de Resultados Sincronizada';
        document.body.appendChild(aviso);

        // Agregar estilo de animación si no existe
        if (!document.getElementById('animFade')) {
            const style = document.createElement('style');
            style.id = 'animFade';
            style.innerHTML = `@keyframes fadeInOut { 0% {opacity:0; bottom:0;} 15% {opacity:1; bottom:20px;} 85% {opacity:1; bottom:20px;} 100% {opacity:0; bottom:0;} }`;
            document.head.appendChild(style);
        }

        setTimeout(() => aviso.remove(), 4000);
    }).catch(err => {
        console.error(err);
        alert("Error al generar PDF. Ver consola.");
        reportContainer.style.display = 'none';
    });
}
