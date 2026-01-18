const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.RENDER_EXTERNAL_HOSTNAME
  ? path.join('/data', 'league_senior.db')
  : (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'league_senior.db')
    : path.resolve(__dirname, 'league.db'));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

function initDb() {
  db.serialize(() => {
    // Tabla Equipos
    db.run(`CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo TEXT
    )`);

    // Tabla Jugadores
    db.run(`CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      team_id INTEGER,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )`);

    // Intentar agregar nuevas columnas (Si ya existen, fallará silenciosamente)
    db.run("ALTER TABLE players ADD COLUMN cedula TEXT", () => { });
    db.run("ALTER TABLE players ADD COLUMN dob TEXT", () => { });
    db.run("ALTER TABLE players ADD COLUMN type TEXT", () => { });
    db.run("ALTER TABLE players ADD COLUMN jersey_number INTEGER", () => { });
    db.run("ALTER TABLE players ADD COLUMN inscripcion INTEGER DEFAULT 0", () => { });
    db.run("ALTER TABLE players ADD COLUMN amarilla INTEGER DEFAULT 0", () => { });
    db.run("ALTER TABLE players ADD COLUMN roja INTEGER DEFAULT 0", () => { });

    // Tabla Partidos (Opcional por ahora, pero buena para el futuro)
    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_a_id INTEGER,
      team_b_id INTEGER,
      date TEXT,
      score_a INTEGER,
      score_b INTEGER,
      scorers_a TEXT, -- JSON o texto
      scorers_b TEXT, -- JSON o texto
      yellows_a TEXT,
      yellows_b TEXT,
      reds_a TEXT,
      reds_b TEXT
    )`);

    // Agregar columna para número de fecha
    db.run("ALTER TABLE matches ADD COLUMN match_day INTEGER", () => { });

    // Tabla Configuraciones (Nombre de la Liga)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      league_name TEXT
    )`);

    // Insertar configuración por defecto si no existe
    db.run(`INSERT OR IGNORE INTO settings (id, league_name) VALUES (1, 'AFEMEC - SENIOR')`);
  });
}

module.exports = {
  db,
  initDb
};
