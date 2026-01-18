const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const os = require('os');

// Sub-servidores por categoría
const categories = ['senior', 'master', 'ejecutivo'];
const apps = {};

const mainApp = express();
const PORT = process.env.PORT || 3000;

mainApp.use(cors());
mainApp.use(bodyParser.json());

// Servir archivos estáticos de la raíz (opcional)
mainApp.use(express.static('.'));

// Configurar cada categoría
categories.forEach(cat => {
    const catPath = path.join(__dirname, cat);
    const { db, initDb } = require(path.join(catPath, 'database.js'));

    // Inicializar DB de la categoría
    initDb();

    // Crear sub-app de Express para esta categoría
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    app.use(express.static(catPath));

    // --- API ENDPOINTS (Copia del server original, pero usando la DB correcta) ---

    app.get('/api/teams', (req, res) => {
        db.all("SELECT * FROM teams", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.post('/api/teams', (req, res) => {
        const { name, logo } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });
        db.run("INSERT INTO teams (name, logo) VALUES (?, ?)", [name, logo], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, logo });
        });
    });

    app.get('/api/teams/:id/players', (req, res) => {
        db.all("SELECT * FROM players WHERE team_id = ?", [req.params.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.post('/api/teams/:id/players', (req, res) => {
        const { name, cedula, dob, type, jerseyNumber } = req.body;
        db.run("INSERT INTO players (name, team_id, cedula, dob, type, jersey_number) VALUES (?, ?, ?, ?, ?, ?)",
            [name, req.params.id, cedula, dob, type, jerseyNumber], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, name, team_id: req.params.id, cedula, dob, type, jersey_number: jerseyNumber });
            });
    });

    app.get('/api/players/all', (req, res) => {
        const sql = `SELECT p.*, t.name as team_name FROM players p LEFT JOIN teams t ON p.team_id = t.id ORDER BY t.name, p.name`;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.patch('/api/players/:id/status', (req, res) => {
        const { field, value } = req.body;
        db.run(`UPDATE players SET ${field} = ? WHERE id = ?`, [value ? 1 : 0, req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
        });
    });

    app.get('/api/matches', (req, res) => {
        const joinSql = `SELECT m.*, t1.name as equipoA, t2.name as equipoB FROM matches m LEFT JOIN teams t1 ON m.team_a_id = t1.id LEFT JOIN teams t2 ON m.team_b_id = t2.id`;
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

    app.post('/api/matches', (req, res) => {
        const { equipoA, equipoB, fecha, scoreA, scoreB, scorersA, scorersB, yellowsA, yellowsB, redsA, redsB, matchDay } = req.body;
        const sql = `INSERT INTO matches (team_a_id, team_b_id, date, score_a, score_b, scorers_a, scorers_b, yellows_a, yellows_b, reds_a, reds_b, match_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [equipoA, equipoB, fecha, scoreA, scoreB, JSON.stringify(scorersA), JSON.stringify(scorersB), JSON.stringify(yellowsA), JSON.stringify(yellowsB), JSON.stringify(redsA), JSON.stringify(redsB), matchDay], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
    });

    app.delete('/api/matches/:id', (req, res) => {
        db.run("DELETE FROM matches WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        });
    });

    app.delete('/api/players/:id', (req, res) => {
        db.run("DELETE FROM players WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
        });
    });

    app.delete('/api/teams/:id', (req, res) => {
        // Eliminar jugadores del equipo primero
        db.run("DELETE FROM players WHERE team_id = ?", [req.params.id], (err) => {
            if (err) console.error(err);
            db.run("DELETE FROM teams WHERE id = ?", [req.params.id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Deleted" });
            });
        });
    });

    app.get('/api/settings', (req, res) => {
        db.get("SELECT league_name FROM settings WHERE id = 1", (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ league_name: row ? row.league_name : `AFEMEC - ${cat.toUpperCase()}`, port: PORT });
        });
    });

    app.post('/api/settings', (req, res) => {
        const { league_name } = req.body;
        db.run("UPDATE settings SET league_name = ? WHERE id = 1", [league_name], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
        });
    });

    // Montar la sub-app en un prefijo (ej: /senior, /master)
    mainApp.use(`/${cat}`, app);
});

// Ruta raíz: Mostrar la nueva Landing Page
mainApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

mainApp.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Multi-Torneo iniciado en puerto ${PORT}`);
});
