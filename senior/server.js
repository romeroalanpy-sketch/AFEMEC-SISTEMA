const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db, initDb } = require('./database');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files (html, css, js) from root


// Initialize DB tables
initDb();

// --- API ENDPOINTS ---

// GET /api/teams - List all teams
app.get('/api/teams', (req, res) => {
    db.all("SELECT * FROM teams", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /api/teams - Create a new team
app.post('/api/teams', (req, res) => {
    const { name, logo } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const sql = "INSERT INTO teams (name, logo) VALUES (?, ?)";
    db.run(sql, [name, logo], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, logo });
    });
});

// GET /api/teams/:id/players - List players for a specific team
app.get('/api/teams/:id/players', (req, res) => {
    const teamId = req.params.id;
    const sql = "SELECT * FROM players WHERE team_id = ?";
    db.all(sql, [teamId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/teams/:id/players', (req, res) => {
    const teamId = req.params.id;
    const { name, cedula, dob, type, jerseyNumber } = req.body;
    if (!name) return res.status(400).json({ error: "Player name is required" });

    const sql = "INSERT INTO players (name, team_id, cedula, dob, type, jersey_number) VALUES (?, ?, ?, ?, ?, ?)";
    db.run(sql, [name, teamId, cedula, dob, type, jerseyNumber], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, team_id: teamId, cedula, dob, type, jersey_number: jerseyNumber });
    });
});

// GET /api/players/all - List all players with team info
app.get('/api/players/all', (req, res) => {
    const sql = `
        SELECT p.*, t.name as team_name 
        FROM players p 
        LEFT JOIN teams t ON p.team_id = t.id
        ORDER BY t.name, p.name
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// PATCH /api/players/:id/status - Update player status (inscripción, yellow, red)
app.patch('/api/players/:id/status', (req, res) => {
    const id = req.params.id;
    const { field, value } = req.body;

    // Validar que el campo sea uno de los permitidos
    const allowedFields = ['inscripcion', 'amarilla', 'roja'];
    if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: "Campo no válido" });
    }

    const sql = `UPDATE players SET ${field} = ? WHERE id = ?`;
    db.run(sql, [value ? 1 : 0, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated", field, value });
    });
});

// DELETE /api/players/:id - Delete a player
app.delete('/api/players/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM players WHERE id = ?", id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted", changes: this.changes });
    });
});

// DELETE /api/teams/:id - Delete a team
app.delete('/api/teams/:id', (req, res) => {
    const id = req.params.id;
    // Note: This relies on manual cascading or foreign key constraints if defined strictly
    db.run("DELETE FROM players WHERE team_id = ?", id, (err) => {
        if (err) console.error(err);
    });
    db.run("DELETE FROM teams WHERE id = ?", id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted", changes: this.changes });
    });
});

// GET /api/matches - List all matches
app.get('/api/matches', (req, res) => {
    db.all("SELECT * FROM matches", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse JSON fields
        const parsedRows = rows.map(r => ({
            ...r,
            scorersA: JSON.parse(r.scorers_a || '[]'),
            scorersB: JSON.parse(r.scorers_b || '[]'),
            yellowsA: JSON.parse(r.yellows_a || '[]'),
            yellowsB: JSON.parse(r.yellows_b || '[]'),
            redsA: JSON.parse(r.reds_a || '[]'),
            redsB: JSON.parse(r.reds_b || '[]'),
            equipoA: r.team_a_name, // We need to join names ideally, but for simplicity let's store names or IDs. 
            // The current frontend uses implementation uses names. Let's adjust the query to join or store names.
            // For simplicity in this migration, I will assume the frontend will send and expect Names or I should JOIN.
            // Let's keep it simple: The database schema I made has team_a_id and team_b_id. 
            // I should modify the POST to accept IDs or look them up.
            // OR, to minimize frontend refactor specific to this request, I can just store names in the DB if I change the schema, 
            // BUT `database.js` already defined team_a_id (INTEGER).
            // So I will need to perform a JOIN here to get names 'equipoA' and 'equipoB' which the frontend expects.
        }));

        // Let's do a JOIN query
        const joinSql = `
      SELECT m.*, t1.name as equipoA, t2.name as equipoB 
      FROM matches m
      LEFT JOIN teams t1 ON m.team_a_id = t1.id
      LEFT JOIN teams t2 ON m.team_b_id = t2.id
    `;

        db.all(joinSql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const parsed = rows.map(r => ({
                ...r,
                scorersA: JSON.parse(r.scorers_a || '[]'),
                scorersB: JSON.parse(r.scorers_b || '[]'),
                yellowsA: JSON.parse(r.yellows_a || '[]'),
                yellowsB: JSON.parse(r.yellows_b || '[]'),
                redsA: JSON.parse(r.reds_a || '[]'),
                redsB: JSON.parse(r.reds_b || '[]')
            }));
            res.json(parsed);
        });
    });
});

// POST /api/matches - Create a new match
app.post('/api/matches', (req, res) => {
    const { equipoA, equipoB, fecha, scoreA, scoreB, scorersA, scorersB, yellowsA, yellowsB, redsA, redsB, matchDay } = req.body;
    // We need to look up IDs for equipoA and equipoB names... or change frontend to send IDs.
    // changing frontend to send IDs is better.
    // For now let's handle the look up here or assume frontend sends IDs? 
    // The frontend currently uses names in the Select values? 
    // Wait, frontend: `const equipoA = equipos[indexA].nombre;`
    // I will update frontend to send IDs.
    // NOTE: SQL modified to include match_day
    const sql = `INSERT INTO matches (team_a_id, team_b_id, date, score_a, score_b, scorers_a, scorers_b, yellows_a, yellows_b, reds_a, reds_b, match_day) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [equipoA, equipoB, fecha, scoreA, scoreB, JSON.stringify(scorersA), JSON.stringify(scorersB),
        JSON.stringify(yellowsA), JSON.stringify(yellowsB), JSON.stringify(redsA), JSON.stringify(redsB), matchDay], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Actualizar estado de tarjetas en la tabla de jugadores automáticamente
            const updateCards = (names, teamId, field) => {
                if (!names || names.length === 0) return;
                // Para cada nombre, marcamos el campo correspondiente como 1
                names.forEach(name => {
                    db.run(`UPDATE players SET ${field} = 1 WHERE name = ? AND team_id = ?`, [name, teamId]);
                });
            };

            updateCards(yellowsA, equipoA, 'amarilla');
            updateCards(yellowsB, equipoB, 'amarilla');
            updateCards(redsA, equipoA, 'roja');
            updateCards(redsB, equipoB, 'roja');

            res.json({ id: this.lastID });
        });
});

// GET /api/settings - Get League Name and Local IP
app.get('/api/settings', (req, res) => {
    db.get("SELECT league_name FROM settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // Find Local IP
        const interfaces = os.networkInterfaces();
        let localIp = 'localhost';
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if ('IPv4' === iface.family && !iface.internal) {
                    localIp = iface.address;
                    break;
                }
            }
        }

        res.json({
            league_name: row ? row.league_name : 'Sistema de Liga',
            local_ip: localIp,
            port: PORT
        });
    });
});

// POST /api/settings - Update League Name
app.post('/api/settings', (req, res) => {
    const { league_name } = req.body;
    db.run("UPDATE settings SET league_name = ? WHERE id = 1", [league_name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated" });
    });
});


// DELETE /api/matches/:id - Delete a match
app.delete('/api/matches/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM matches WHERE id = ?", id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted", changes: this.changes });
    });
});


// Start Server
// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SERVIDOR INICIADO ---`);
    console.log(`Acceso local: http://localhost:${PORT}`);

    // Find and log local network IP
    const interfaces = os.networkInterfaces();
    console.log(`\nPARA COMPARTIR, usa una de estas direcciones en otros dispositivos (conectados al mismo Wifi/Red):`);
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ('IPv4' === iface.family && !iface.internal) {
                console.log(` -> http://${iface.address}:${PORT}`);
            }
        }
    }
    console.log(`-------------------------\n`);
});
