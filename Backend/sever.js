const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─── QUIZ ROUTES ────────────────────────────────────────────────────────────

// GET all quizzes (with question count)
app.get("/api/quizzes", (req, res) => {
  const quizzes = db
    .prepare(
      `
    SELECT q.*, COUNT(qu.id) as question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `
    )
    .all();
  res.json(quizzes);
});

// GET single quiz with questions
app.get("/api/quizzes/:id", (req, res) => {
  const quiz = db
    .prepare("SELECT * FROM quizzes WHERE id = ?")
    .get(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const questions = db
    .prepare(
      "SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC"
    )
    .all(req.params.id);

  res.json({ ...quiz, questions });
});

// POST create new quiz
app.post("/api/quizzes", (req, res) => {
  const { title, description } = req.body;
  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }
  const result = db
    .prepare("INSERT INTO quizzes (title, description) VALUES (?, ?)")
    .run(title.trim(), description?.trim() || "");

  const quiz = db
    .prepare("SELECT * FROM quizzes WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(quiz);
});

// PUT update quiz title/description
app.put("/api/quizzes/:id", (req, res) => {
  const { title, description } = req.body;
  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }
  db.prepare(
    "UPDATE quizzes SET title = ?, description = ? WHERE id = ?"
  ).run(title.trim(), description?.trim() || "", req.params.id);

  const quiz = db
    .prepare("SELECT * FROM quizzes WHERE id = ?")
    .get(req.params.id);
  res.json(quiz);
});

// DELETE quiz (cascades to questions)
app.delete("/api/quizzes/:id", (req, res) => {
  db.prepare("DELETE FROM quizzes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── QUESTION ROUTES ─────────────────────────────────────────────────────────

// POST add question to quiz
app.post("/api/quizzes/:id/questions", (req, res) => {
  const { question_text, answer_a, answer_b, answer_c, answer_d, correct_answer } = req.body;

  if (!question_text || !answer_a || !answer_b || !answer_c || !answer_d || !correct_answer) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!["a", "b", "c", "d"].includes(correct_answer)) {
    return res.status(400).json({ error: "correct_answer must be a, b, c or d" });
  }

  // Get current max position
  const max = db
    .prepare("SELECT MAX(position) as m FROM questions WHERE quiz_id = ?")
    .get(req.params.id);
  const position = (max.m ?? -1) + 1;

  const result = db
    .prepare(
      `INSERT INTO questions (quiz_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, position);

  const question = db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(question);
});

// PUT update question
app.put("/api/questions/:id", (req, res) => {
  const { question_text, answer_a, answer_b, answer_c, answer_d, correct_answer } = req.body;;

  if (!question_text || !answer_a || !answer_b || !answer_c || !answer_d || !correct_answer) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.prepare(
    `UPDATE questions SET question_text=?, answer_a=?, answer_b=?, answer_c=?, answer_d=?, correct_answer=? WHERE id=?`
  ).run(question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, req.params.id);

  const question = db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .get(req.params.id);
  res.json(question);
});

// DELETE question
app.delete("/api/questions/:id", (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ QuizLive backend running on http://localhost:${PORT}`);
});
