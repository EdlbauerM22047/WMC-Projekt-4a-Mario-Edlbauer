const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const db = require("./db");

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── In-Memory Rooms ───────────────────────────────────────────────────────
// rooms: Map<code, { quizId, hostNickname, players: [{id, nickname}], status }>
const rooms = new Map();
// wsClients: Map<ws, { code, nickname, isHost }>
const wsClients = new Map();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

function broadcast(code, message) {
  const data = JSON.stringify(message);
  for (const [ws, info] of wsClients.entries()) {
    if (info.code === code && ws.readyState === 1) {
      ws.send(data);
    }
  }
}

// ── REST API ──────────────────────────────────────────────────────────────

// GET all quizzes
app.get("/api/quizzes", (req, res) => {
  const quizzes = db.prepare(`
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all();
  res.json(quizzes);
});

// GET single quiz with questions
app.get("/api/quizzes/:id", (req, res) => {
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  const questions = db.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC").all(req.params.id);
  res.json({ ...quiz, questions });
});

// POST create quiz
app.post("/api/quizzes", (req, res) => {
  const { title, description } = req.body;
  if (!title || title.trim() === "") return res.status(400).json({ error: "Title is required" });
  const result = db.prepare("INSERT INTO quizzes (title, description) VALUES (?, ?)").run(title.trim(), description?.trim() || "");
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(quiz);
});

// PUT update quiz
app.put("/api/quizzes/:id", (req, res) => {
  const { title, description } = req.body;
  if (!title || title.trim() === "") return res.status(400).json({ error: "Title is required" });
  db.prepare("UPDATE quizzes SET title = ?, description = ? WHERE id = ?").run(title.trim(), description?.trim() || "", req.params.id);
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(req.params.id);
  res.json(quiz);
});

// DELETE quiz
app.delete("/api/quizzes/:id", (req, res) => {
  db.prepare("DELETE FROM quizzes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST add question
app.post("/api/quizzes/:id/questions", (req, res) => {
  const { question_text, answer_a, answer_b, answer_c, answer_d, correct_answer } = req.body;
  if (!question_text || !answer_a || !answer_b || !answer_c || !answer_d || !correct_answer)
    return res.status(400).json({ error: "All fields are required" });
  if (!["a","b","c","d"].includes(correct_answer))
    return res.status(400).json({ error: "correct_answer must be a, b, c or d" });
  const max = db.prepare("SELECT MAX(position) as m FROM questions WHERE quiz_id = ?").get(req.params.id);
  const position = (max.m ?? -1) + 1;
  const result = db.prepare(`
    INSERT INTO questions (quiz_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, position);
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(question);
});

// PUT update question
app.put("/api/questions/:id", (req, res) => {
  const { question_text, answer_a, answer_b, answer_c, answer_d, correct_answer } = req.body;
  if (!question_text || !answer_a || !answer_b || !answer_c || !answer_d || !correct_answer)
    return res.status(400).json({ error: "All fields are required" });
  db.prepare(`
    UPDATE questions SET question_text=?, answer_a=?, answer_b=?, answer_c=?, answer_d=?, correct_answer=? WHERE id=?
  `).run(question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, req.params.id);
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(req.params.id);
  res.json(question);
});

// DELETE question
app.delete("/api/questions/:id", (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST create room (host starts a lobby)
app.post("/api/rooms", (req, res) => {
  const { quizId, nickname } = req.body;
  if (!quizId || !nickname) return res.status(400).json({ error: "quizId and nickname required" });
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  const code = generateCode();
  rooms.set(code, {
    quizId,
    quizTitle: quiz.title,
    hostNickname: nickname,
    players: [{ id: Date.now().toString(), nickname, isHost: true }],
    status: "waiting"
  });
  res.status(201).json({ code, quizTitle: quiz.title });
});

// GET room info
app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ code: req.params.code.toUpperCase(), ...room });
});

// ── WebSocket Server ──────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // JOIN: player joins a room
    if (msg.type === "join") {
      const { code, nickname } = msg;
      const room = rooms.get(code?.toUpperCase());

      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
        return;
      }
      if (room.status !== "waiting") {
        ws.send(JSON.stringify({ type: "error", message: "Game already started" }));
        return;
      }

      const playerId = Date.now().toString() + Math.random().toString(36).slice(2);
      wsClients.set(ws, { code: code.toUpperCase(), nickname, isHost: false, playerId });

      room.players.push({ id: playerId, nickname, isHost: false });

      // Confirm join to this player
      ws.send(JSON.stringify({
        type: "joined",
        playerId,
        room: { code: code.toUpperCase(), quizTitle: room.quizTitle, players: room.players }
      }));

      // Tell everyone else
      broadcast(code.toUpperCase(), {
        type: "player_joined",
        players: room.players
      });
    }

    // HOST_JOIN: host connects via WebSocket (already in room from REST call)
    if (msg.type === "host_join") {
      const { code, nickname } = msg;
      const room = rooms.get(code?.toUpperCase());
      if (!room) return;
      wsClients.set(ws, { code: code.toUpperCase(), nickname, isHost: true });
      ws.send(JSON.stringify({
        type: "joined",
        room: { code: code.toUpperCase(), quizTitle: room.quizTitle, players: room.players }
      }));
    }

    // START_GAME: host starts the game
    if (msg.type === "start_game") {
      const clientInfo = wsClients.get(ws);
      if (!clientInfo || !clientInfo.isHost) return;

      const room = rooms.get(clientInfo.code);
      if (!room) return;
      room.status = "playing";

      broadcast(clientInfo.code, { type: "game_started", quizId: room.quizId });
    }
  });

  ws.on("close", () => {
    const info = wsClients.get(ws);
    if (info) {
      const room = rooms.get(info.code);
      if (room && info.playerId) {
        room.players = room.players.filter(p => p.id !== info.playerId);
        broadcast(info.code, { type: "player_left", players: room.players });
      }
      wsClients.delete(ws);
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ QuizLive backend running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
});