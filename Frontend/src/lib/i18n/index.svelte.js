const translations = {
  en: {
    appName: "QuizLive", appSubtitle: "Join a game or create your own quiz",
    yourNickname: "Your Nickname", nicknamePlaceholder: "Enter nickname...",
    gameCode: "Game Code", gameCodePlaceholder: "e.g. AB4X9",
    joinGame: "Join Game", createHostQuiz: "+ Create & Host a Quiz",
    noNickname: "Please enter a nickname first!", noCode: "Please enter a game code!",
    myQuizzes: "My Quizzes", newQuiz: "+ New Quiz",
    questions: "questions", played: "played", times: "×",
    edit: "Edit", delete: "Delete", deleteConfirm: "Delete this quiz?",
    noQuizzes: "No quizzes yet. Create your first one!",
    quizTitle: "Quiz Title", quizDescription: "Description (optional)",
    createQuiz: "Create Quiz", cancel: "Cancel", back: "← Back",
    editQuiz: "Edit Quiz", save: "Save", addQuestion: "+ Add Question",
    questionText: "Question", answerA: "Answer A", answerB: "Answer B",
    answerC: "Answer C", answerD: "Answer D", correctAnswer: "Correct Answer",
    saveQuestion: "Save Question", deleteQuestion: "Delete",
    noQuestions: "No questions yet.", loading: "Loading...", error: "Something went wrong.",
    hostGame: "▶ Host this Quiz", quizzes: "Quizzes", stats: "Stats", gamesPlayed: "Games"
  },
  de: {
    appName: "QuizLive", appSubtitle: "Tritt einem Spiel bei oder erstelle dein eigenes Quiz",
    yourNickname: "Dein Nickname", nicknamePlaceholder: "Nickname eingeben...",
    gameCode: "Game-Code", gameCodePlaceholder: "z.B. AB4X9",
    joinGame: "Spiel beitreten", createHostQuiz: "+ Quiz erstellen & hosten",
    noNickname: "Bitte zuerst einen Nickname eingeben!", noCode: "Bitte einen Game-Code eingeben!",
    myQuizzes: "Meine Quizzes", newQuiz: "+ Neues Quiz",
    questions: "Fragen", played: "gespielt", times: "×",
    edit: "Bearbeiten", delete: "Löschen", deleteConfirm: "Dieses Quiz löschen?",
    noQuizzes: "Noch keine Quizzes. Erstelle dein erstes!",
    quizTitle: "Quiz-Titel", quizDescription: "Beschreibung (optional)",
    createQuiz: "Quiz erstellen", cancel: "Abbrechen", back: "← Zurück",
    editQuiz: "Quiz bearbeiten", save: "Speichern", addQuestion: "+ Frage hinzufügen",
    questionText: "Frage", answerA: "Antwort A", answerB: "Antwort B",
    answerC: "Antwort C", answerD: "Antwort D", correctAnswer: "Richtige Antwort",
    saveQuestion: "Frage speichern", deleteQuestion: "Löschen",
    noQuestions: "Noch keine Fragen.", loading: "Laden...", error: "Etwas ist schiefgelaufen.",
    hostGame: "▶ Quiz starten", quizzes: "Quizzes", stats: "Statistiken", gamesPlayed: "Spiele"
  }
};

let lang = $state("de");

export function getI18n() {
  return {
    get lang() { return lang; },
    set lang(v) { lang = v; },
    get t() { return translations[lang]; },
    toggle() { lang = lang === "de" ? "en" : "de"; }
  };
}