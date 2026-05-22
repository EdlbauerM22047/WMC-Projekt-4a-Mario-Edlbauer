let nickname = $state("");
let currentGameCode = $state("");
let currentQuizId = $state(null);

export function getGameStore() {
  return {
    get nickname() { return nickname; },
    set nickname(v) { nickname = v; },
    get currentGameCode() { return currentGameCode; },
    set currentGameCode(v) { currentGameCode = v; },
    get currentQuizId() { return currentQuizId; },
    set currentQuizId(v) { currentQuizId = v; },
    reset() { currentGameCode = ""; currentQuizId = null; }
  };
}