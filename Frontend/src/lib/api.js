const STORAGE_KEY = "quiz-live-data";

function loadStore() {
  if (typeof localStorage === "undefined") {
    return { quizzes: [] };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = { quizzes: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { quizzes: [] };
  }
}

function saveStore(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureQuiz(quiz) {
  return {
    ...quiz,
    question_count: quiz.questions?.length ?? 0,
    games_played: quiz.games_played ?? 0,
    questions: quiz.questions ?? []
  };
}

export async function getQuizzes() {
  const state = loadStore();
  return state.quizzes.map((quiz) => ensureQuiz(quiz));
}

export async function createQuiz(data) {
  const state = loadStore();
  const quiz = {
    id: crypto.randomUUID(),
    title: data.title,
    description: data.description || "",
    questions: [],
    question_count: 0,
    games_played: 0
  };

  state.quizzes = [...state.quizzes, quiz];
  saveStore(state);
  return ensureQuiz(quiz);
}

export async function deleteQuiz(id) {
  const state = loadStore();
  state.quizzes = state.quizzes.filter((quiz) => quiz.id !== id);
  saveStore(state);
}

export async function getQuiz(id) {
  const state = loadStore();
  const quiz = state.quizzes.find((item) => item.id === id);
  if (!quiz) {
    throw new Error("Quiz not found.");
  }
  return ensureQuiz(quiz);
}

export async function updateQuiz(id, data) {
  const state = loadStore();
  const index = state.quizzes.findIndex((quiz) => quiz.id === id);
  if (index === -1) {
    throw new Error("Quiz not found.");
  }

  const quiz = {
    ...state.quizzes[index],
    title: data.title ?? state.quizzes[index].title,
    description: data.description ?? state.quizzes[index].description
  };

  state.quizzes[index] = quiz;
  saveStore(state);
  return ensureQuiz(quiz);
}

export async function createQuestion(quizId, data) {
  const state = loadStore();
  const quiz = state.quizzes.find((item) => item.id === quizId);
  if (!quiz) {
    throw new Error("Quiz not found.");
  }

  const question = {
    id: crypto.randomUUID(),
    question_text: data.question_text,
    answer_a: data.answer_a,
    answer_b: data.answer_b,
    answer_c: data.answer_c,
    answer_d: data.answer_d,
    correct_answer: data.correct_answer
  };

  quiz.questions = [...(quiz.questions || []), question];
  saveStore(state);
  return question;
}

export async function updateQuestion(questionId, data) {
  const state = loadStore();
  for (const quiz of state.quizzes) {
    const questionIndex = quiz.questions?.findIndex((q) => q.id === questionId);
    if (questionIndex >= 0) {
      const updated = {
        ...quiz.questions[questionIndex],
        ...data
      };
      quiz.questions[questionIndex] = updated;
      saveStore(state);
      return updated;
    }
  }
  throw new Error("Question not found.");
}

export async function deleteQuestion(questionId) {
  const state = loadStore();
  for (const quiz of state.quizzes) {
    if (!quiz.questions) continue;
    const before = quiz.questions.length;
    quiz.questions = quiz.questions.filter((q) => q.id !== questionId);
    if (quiz.questions.length !== before) {
      saveStore(state);
      return;
    }
  }
  throw new Error("Question not found.");
}
