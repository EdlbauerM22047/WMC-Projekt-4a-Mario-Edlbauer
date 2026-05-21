const BASE = "http://localhost:3000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const getQuizzes = () => request("/quizzes");
export const getQuiz = (id) => request(`/quizzes/${id}`);
export const createQuiz = (data) => request("/quizzes", { method: "POST", body: JSON.stringify(data) });
export const updateQuiz = (id, data) => request(`/quizzes/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteQuiz = (id) => request(`/quizzes/${id}`, { method: "DELETE" });
export const createQuestion = (quizId, data) => request(`/quizzes/${quizId}/questions`, { method: "POST", body: JSON.stringify(data) });
export const updateQuestion = (id, data) => request(`/questions/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteQuestion = (id) => request(`/questions/${id}`, { method: "DELETE" });