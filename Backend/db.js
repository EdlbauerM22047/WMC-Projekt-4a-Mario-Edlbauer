const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "quizlive.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_a TEXT NOT NULL,
    answer_b TEXT NOT NULL,
    answer_c TEXT NOT NULL,
    answer_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK(correct_answer IN ('a','b','c','d')),
    position INTEGER DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );
`);

const count = db.prepare("SELECT COUNT(*) as c FROM quizzes").get();
if (count.c === 0) {
  const insertQuiz = db.prepare("INSERT INTO quizzes (title, description) VALUES (?, ?)");
  const insertQ = db.prepare(`
    INSERT INTO questions (quiz_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const quiz = insertQuiz.run("Geography Masterclass", "Test your geography knowledge!");
  insertQ.run(quiz.lastInsertRowid, "What is the capital of Australia?", "Sydney", "Melbourne", "Canberra", "Brisbane", "c", 0);
  insertQ.run(quiz.lastInsertRowid, "Which country has the largest population?", "India", "USA", "Russia", "China", "d", 1);
  insertQ.run(quiz.lastInsertRowid, "What is the longest river in the world?", "Amazon", "Nile", "Yangtze", "Mississippi", "b", 2);
}

module.exports = db;