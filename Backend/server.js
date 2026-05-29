const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const db = require("./db");

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const rooms = new Map();
const wsClients = new Map();
const TIME_LIMIT = 20;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

function broadcast(code, message) {
  const data = JSON.stringify(message);
  for (const [ws, info] of wsClients.entries()) {
    if (info.code === code && ws.readyState === 1) ws.send(data);
  }
}

// ── Game Logic ────────────────────────────────────────────────────────────

function sendNextQuestion(code) {
  const room = rooms.get(code);
  if (!room) return;
  const { currentQuestionIndex } = room.gameState;

  if (currentQuestionIndex >= room.questions.length) {
    const finalScores = Object.entries(room.gameState.scores)
      .map(([nickname, data]) => ({ nickname, ...data }))
      .sort((a, b) => b.points - a.points);
    broadcast(code, { type: "game_over", scores: finalScores });
    room.status = "finished";
    return;
  }

  const q = room.questions[currentQuestionIndex];
  room.gameState.currentAnswers = {};
  room.gameState.questionStartTime = Date.now();

  broadcast(code, {
    type: "question",
    questionIndex: currentQuestionIndex,
    total: room.questions.length,
    text: q.question_text,
    answers: { a: q.answer_a, b: q.answer_b, c: q.answer_c, d: q.answer_d },
    timeLimit: TIME_LIMIT
  });

  room.gameState.timer = setTimeout(() => revealAnswer(code), TIME_LIMIT * 1000);
}

function revealAnswer(code) {
  const room = rooms.get(code);
  if (!room) return;

  if (room.gameState.timer) {
    clearTimeout(room.gameState.timer);
    room.gameState.timer = null;
  }

  const q = room.questions[room.gameState.currentQuestionIndex];
  const correctAnswer = q.correct_answer;
  const answers = room.gameState.currentAnswers;
  const distribution = { a: 0, b: 0, c: 0, d: 0 };

  for (const [nickname, data] of Object.entries(answers)) {
    if (distribution[data.answer] !== undefined) distribution[data.answer]++;
    if (data.answer === correctAnswer) {
      const elapsed = (data.timestamp - room.gameState.questionStartTime) / 1000;
      const speedBonus = Math.round(500 * Math.max(0, (TIME_LIMIT - elapsed) / TIME_LIMIT));
      room.gameState.scores[nickname].points += 1000 + speedBonus;
      room.gameState.scores[nickname].correct++;
    }
  }

  const scoresList = Object.entries(room.gameState.scores)
    .map(([nickname, data]) => ({ nickname, ...data }))
    .sort((a, b) => b.points - a.points);

  room.gameState.currentQuestionIndex++;

  broadcast(code, {
    type: "question_result",
    correctAnswer,
    distribution,
    scores: scoresList,
    isLastQuestion: room.gameState.currentQuestionIndex >= room.questions.length
  });
  // ── Host manually advances – no auto setTimeout here ──
}

// ── REST API ──────────────────────────────────────────────────────────────

app.get("/api/quizzes", (req, res) => {
  const quizzes = db.prepare(`
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id ORDER BY q.created_at DESC
  `).all();
  res.json(quizzes);
});

app.get("/api/quizzes/:id", (req, res) => {
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  const questions = db.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC").all(req.params.id);
  res.json({ ...quiz, questions });
});

app.post("/api/quizzes", (req, res) => {
  const { title, description } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
  const result = db.prepare("INSERT INTO quizzes (title, description) VALUES (?, ?)").run(title.trim(), description?.trim() || "");
  res.status(201).json(db.prepare("SELECT * FROM quizzes WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/quizzes/:id", (req, res) => {
  const { title, description } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
  db.prepare("UPDATE quizzes SET title = ?, description = ? WHERE id = ?").run(title.trim(), description?.trim() || "", req.params.id);
  res.json(db.prepare("SELECT * FROM quizzes WHERE id = ?").get(req.params.id));
});

app.delete("/api/quizzes/:id", (req, res) => {
  db.prepare("DELETE FROM quizzes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

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
  res.status(201).json(db.prepare("SELECT * FROM questions WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/questions/:id", (req, res) => {
  const { question_text, answer_a, answer_b, answer_c, answer_d, correct_answer } = req.body;
  if (!question_text || !answer_a || !answer_b || !answer_c || !answer_d || !correct_answer)
    return res.status(400).json({ error: "All fields are required" });
  db.prepare(`UPDATE questions SET question_text=?, answer_a=?, answer_b=?, answer_c=?, answer_d=?, correct_answer=? WHERE id=?`)
    .run(question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, req.params.id);
  res.json(db.prepare("SELECT * FROM questions WHERE id = ?").get(req.params.id));
});

app.delete("/api/questions/:id", (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/rooms", (req, res) => {
  const { quizId, nickname } = req.body;
  if (!quizId || !nickname) return res.status(400).json({ error: "quizId and nickname required" });
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  const code = generateCode();
  rooms.set(code, {
    quizId, quizTitle: quiz.title, hostNickname: nickname,
    players: [{ id: Date.now().toString(), nickname, isHost: true }],
    status: "waiting", questions: [], gameState: null
  });
  res.status(201).json({ code, quizTitle: quiz.title });
});

app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ code: req.params.code.toUpperCase(), ...room });
});

// ── WebSocket ─────────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const code = (msg.code?.toUpperCase()) ?? wsClients.get(ws)?.code;

    // JOIN (lobby)
    if (msg.type === "join") {
      const room = rooms.get(code);
      if (!room) { ws.send(JSON.stringify({ type: "error", message: "Room not found" })); return; }
      if (room.status !== "waiting") { ws.send(JSON.stringify({ type: "error", message: "Game already started" })); return; }
      const playerId = Date.now().toString() + Math.random().toString(36).slice(2);
      wsClients.set(ws, { code, nickname: msg.nickname, isHost: false, playerId });
      room.players.push({ id: playerId, nickname: msg.nickname, isHost: false });
      ws.send(JSON.stringify({ type: "joined", playerId, room: { code, quizTitle: room.quizTitle, players: room.players } }));
      broadcast(code, { type: "player_joined", players: room.players });
    }

    // HOST_JOIN (lobby)
    if (msg.type === "host_join") {
      const room = rooms.get(code);
      if (!room) return;
      wsClients.set(ws, { code, nickname: msg.nickname, isHost: true });
      ws.send(JSON.stringify({ type: "joined", room: { code, quizTitle: room.quizTitle, players: room.players } }));
    }

    // GAME_JOIN (game page reconnect)
    if (msg.type === "game_join") {
      const room = rooms.get(code);
      if (!room) { ws.send(JSON.stringify({ type: "error", message: "Room not found" })); return; }
      const isHost = room.hostNickname === msg.nickname;
      wsClients.set(ws, { code, nickname: msg.nickname, isHost });
      ws.send(JSON.stringify({ type: "game_joined", isHost }));
    }

    // START_GAME
    if (msg.type === "start_game") {
      const clientInfo = wsClients.get(ws);
      if (!clientInfo?.isHost) return;
      const room = rooms.get(clientInfo.code);
      if (!room) return;
      const questions = db.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC").all(room.quizId);
      if (questions.length === 0) { ws.send(JSON.stringify({ type: "error", message: "Quiz has no questions" })); return; }
      room.questions = questions;
      room.status = "playing";
      const scores = {};
      for (const player of room.players) {
        if (!player.isHost) scores[player.nickname] = { points: 0, correct: 0 };
      }
      room.gameState = {
        currentQuestionIndex: 0, scores,
        currentAnswers: {}, questionStartTime: null, timer: null,
        totalPlayers: room.players.filter(p => !p.isHost).length
      };
      broadcast(clientInfo.code, { type: "game_started" });
      setTimeout(() => sendNextQuestion(clientInfo.code), 800);
    }

    // ANSWER
    if (msg.type === "answer") {
      const clientInfo = wsClients.get(ws);
      if (!clientInfo || clientInfo.isHost) return;
      const room = rooms.get(clientInfo.code);
      if (!room || room.status !== "playing" || !room.gameState) return;
      if (room.gameState.currentAnswers[clientInfo.nickname]) return;
      if (!["a","b","c","d"].includes(msg.answer)) return;
      room.gameState.currentAnswers[clientInfo.nickname] = { answer: msg.answer, timestamp: Date.now() };
      ws.send(JSON.stringify({ type: "answer_confirmed", answer: msg.answer }));
      if (Object.keys(room.gameState.currentAnswers).length >= room.gameState.totalPlayers) {
        revealAnswer(clientInfo.code);
      }
    }

    // NEXT_QUESTION (host only)
    if (msg.type === "next_question") {
      const clientInfo = wsClients.get(ws);
      if (!clientInfo?.isHost) return;
      const room = rooms.get(clientInfo.code);
      if (!room || room.status !== "playing") return;
      sendNextQuestion(clientInfo.code);
    }
  });

  ws.on("close", () => {
    const info = wsClients.get(ws);
    if (info) {
      const room = rooms.get(info.code);
      if (room && info.playerId && room.status === "waiting") {
        room.players = room.players.filter(p => p.id !== info.playerId);
        broadcast(info.code, { type: "player_left", players: room.players });
      }
      wsClients.delete(ws);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ QuizLive backend running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
});