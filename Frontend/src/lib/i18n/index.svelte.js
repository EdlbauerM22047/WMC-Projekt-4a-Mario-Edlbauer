const translations = {
  de: {
    appSubtitle: "Erstelle und veranstalte dein Quiz-Spiel.",
    yourNickname: "Dein Spitzname",
    nicknamePlaceholder: "z. B. QuizMaster",
    noNickname: "Bitte gib einen Spitznamen ein.",
    gameCode: "Spielcode",
    gameCodePlaceholder: "ABCDE",
    noCode: "Bitte gib einen Spielcode ein.",
    joinGame: "Spiel beitreten",
    createHostQuiz: "Quiz erstellen / hosten",
    back: "Zurück",
    myQuizzes: "Meine Quizze",
    cancel: "Abbrechen",
    newQuiz: "Neues Quiz",
    quizzes: "Quizze",
    questions: "Fragen",
    gamesPlayed: "Spiele gespielt",
    hostGame: "Spiel hosten",
    edit: "Bearbeiten",
    delete: "Löschen",
    deleteConfirm: "Möchtest du dieses Quiz wirklich löschen?",
    error: "Ein Fehler ist aufgetreten.",
    loading: "Lädt...",
    createQuiz: "Quiz erstellen",
    quizTitle: "Quiz-Titel",
    quizDescription: "Quiz-Beschreibung",
    noQuizzes: "Keine Quizze gefunden.",
    editQuiz: "Quiz bearbeiten",
    save: "Speichern",
    addQuestion: "Frage hinzufügen",
    questionText: "Fragetext",
    correctAnswer: "Richtige Antwort",
    saveQuestion: "Frage speichern",
    noQuestions: "Keine Fragen vorhanden.",
    join: "Beitreten"
  },
  en: {
    appSubtitle: "Create and host your quiz game.",
    yourNickname: "Your nickname",
    nicknamePlaceholder: "e.g. QuizMaster",
    noNickname: "Please enter a nickname.",
    gameCode: "Game code",
    gameCodePlaceholder: "ABCDE",
    noCode: "Please enter a game code.",
    joinGame: "Join game",
    createHostQuiz: "Create / host quiz",
    back: "Back",
    myQuizzes: "My quizzes",
    cancel: "Cancel",
    newQuiz: "New quiz",
    quizzes: "Quizzes",
    questions: "Questions",
    gamesPlayed: "Games played",
    hostGame: "Host game",
    edit: "Edit",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this quiz?",
    error: "An error occurred.",
    loading: "Loading...",
    createQuiz: "Create quiz",
    quizTitle: "Quiz title",
    quizDescription: "Quiz description",
    noQuizzes: "No quizzes found.",
    editQuiz: "Edit quiz",
    save: "Save",
    addQuestion: "Add question",
    questionText: "Question text",
    correctAnswer: "Correct answer",
    saveQuestion: "Save question",
    noQuestions: "No questions yet.",
    join: "Join"
  }
};

let currentLanguage = "de";

export function getI18n() {
  const i18n = {
    get lang() {
      return currentLanguage;
    },
    get t() {
      return translations[currentLanguage];
    },
    toggle() {
      currentLanguage = currentLanguage === "de" ? "en" : "de";
    }
  };

  return i18n;
}
