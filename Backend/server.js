const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
// WebSocket-Verbindung für das Svelte-Frontend erlauben
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Standard-Port von Vite/Svelte
        methods: ["GET", "POST"]
    }
});

// SQLite-Datenbank initialisieren
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Fehler beim Öffnen der DB:", err.message);
    else console.log("Verbunden mit der SQLite-Datenbank.");
});

// Tabellen für Quizzes und Fragen automatisch anlegen (Meilenstein 2)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER,
        question_text TEXT,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_option TEXT,
        FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
    )`);
});

// API-Test-Route
app.get('/api/status', (req, res) => {
    res.json({ message: "Backend läuft, DB ist bereit!" });
});

// WebSockets für deine Live-Lobby (Meilenstein 3 & 4)
io.on('connection', (socket) => {
    console.log('Ein Spieler hat sich verbunden:', socket.id);

    // Event: Spieler tritt einer Lobby bei
    socket.on('join_game', (data) => {
        socket.join(data.gameCode);
        console.log(`Spieler ${data.nickname} ist dem Spiel ${data.gameCode} beigetreten`);
    });

    socket.on('disconnect', () => {
        console.log('Spieler hat die Verbindung getrennt.');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Backend läuft auf http://localhost:${PORT}`);
});