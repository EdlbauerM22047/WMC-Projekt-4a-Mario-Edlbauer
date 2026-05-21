<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import * as api from "$lib/api.js";

  const i18n = getI18n();

  const quizId = $derived($page.params.id);

  // Quiz state
  let quiz = $state(null);
  let loading = $state(true);
  let error = $state("");

  // Edit title state
  let editTitle = $state("");
  let editDescription = $state("");
  let savingTitle = $state(false);
  let titleSaved = $state(false);

  // New question form state
  let showQuestionForm = $state(false);
  let editingQuestionId = $state(null);
  let qText = $state("");
  let qA = $state("");
  let qB = $state("");
  let qC = $state("");
  let qD = $state("");
  let qCorrect = $state("a");
  let savingQuestion = $state(false);
  let questionFormError = $state("");

  onMount(async () => {
    await loadQuiz();
  });

  async function loadQuiz() {
    try {
      loading = true;
      error = "";
      quiz = await api.getQuiz(quizId);
      editTitle = quiz.title;
      editDescription = quiz.description || "";
    } catch (e) {
      error = i18n.t.error;
    } finally {
      loading = false;
    }
  }

  async function handleSaveTitle() {
    if (!editTitle.trim()) return;
    try {
      savingTitle = true;
      quiz = await api.updateQuiz(quizId, { title: editTitle.trim(), description: editDescription.trim() });
      titleSaved = true;
      setTimeout(() => (titleSaved = false), 2000);
    } catch (e) {
      alert(i18n.t.error);
    } finally {
      savingTitle = false;
    }
  }

  function openNewQuestionForm() {
    editingQuestionId = null;
    qText = ""; qA = ""; qB = ""; qC = ""; qD = ""; qCorrect = "a";
    questionFormError = "";
    showQuestionForm = true;
  }

  function openEditQuestionForm(q) {
    editingQuestionId = q.id;
    qText = q.question_text;
    qA = q.answer_a; qB = q.answer_b; qC = q.answer_c; qD = q.answer_d;
    qCorrect = q.correct_answer;
    questionFormError = "";
    showQuestionForm = true;
  }

  async function handleSaveQuestion() {
    questionFormError = "";
    if (!qText.trim() || !qA.trim() || !qB.trim() || !qC.trim() || !qD.trim()) {
      questionFormError = "Please fill in all fields!";
      return;
    }
    const data = {
      question_text: qText.trim(),
      answer_a: qA.trim(), answer_b: qB.trim(),
      answer_c: qC.trim(), answer_d: qD.trim(),
      correct_answer: qCorrect
    };
    try {
      savingQuestion = true;
      if (editingQuestionId) {
        const updated = await api.updateQuestion(editingQuestionId, data);
        quiz.questions = quiz.questions.map(q => q.id === editingQuestionId ? updated : q);
      } else {
        const newQ = await api.createQuestion(quizId, data);
        quiz.questions = [...quiz.questions, newQ];
      }
      showQuestionForm = false;
    } catch (e) {
      questionFormError = e.message;
    } finally {
      savingQuestion = false;
    }
  }

  async function handleDeleteQuestion(qId) {
    if (!confirm("Delete this question?")) return;
    try {
      await api.deleteQuestion(qId);
      quiz.questions = quiz.questions.filter(q => q.id !== qId);
    } catch (e) {
      alert(i18n.t.error);
    }
  }

  const answerLabels = { a: "A", b: "B", c: "C", d: "D" };
  const answerColors = { a: "#dbeafe", b: "#fce7f3", c: "#dcfce7", d: "#fef9c3" };
</script>

<div class="container" style="max-width:600px; padding-top:2rem; padding-bottom:4rem;">

  <a href="/quiz" class="text-decoration-none text-muted small">← {i18n.t.back}</a>

  {#if loading}
    <div class="text-center py-5 text-muted mt-4">{i18n.t.loading}</div>
  {:else if error}
    <div class="alert alert-danger mt-3">{error}</div>
  {:else if quiz}

    <!-- Title section -->
    <div class="card-sketch p-4 mt-3 mb-4">
      <h4 class="fw-bold mb-3">{i18n.t.editQuiz}</h4>
      <div class="mb-3">
        <label class="form-label fw-bold">{i18n.t.quizTitle}</label>
        <input
          class="form-control input-sketch"
          bind:value={editTitle}
          maxlength="80"
        />
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">{i18n.t.quizDescription}</label>
        <textarea
          class="form-control input-sketch"
          rows="2"
          bind:value={editDescription}
          maxlength="200"
        ></textarea>
      </div>
      <button
        class="btn btn-sketch btn-sketch-black px-4 py-2"
        onclick={handleSaveTitle}
        disabled={savingTitle}
      >
        {#if titleSaved}
          ✅ Saved!
        {:else}
          {savingTitle ? i18n.t.loading : i18n.t.save}
        {/if}
      </button>
    </div>

    <!-- Questions section -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-bold mb-0" style="border-bottom:2px solid #1a1a1a;">
        {i18n.t.questions} ({quiz.questions?.length || 0})
      </h5>
      <button
        class="btn btn-sketch btn-sketch-black px-3 py-1"
        onclick={() => { showQuestionForm ? showQuestionForm = false : openNewQuestionForm(); }}
      >
        {showQuestionForm ? i18n.t.cancel : i18n.t.addQuestion}
      </button>
    </div>

    <!-- Question form -->
    {#if showQuestionForm}
      <div class="card-sketch p-4 mb-4" style="background:#fffef5;">
        <h6 class="fw-bold mb-3">
          {editingQuestionId ? "✏️ Edit Question" : "➕ New Question"}
        </h6>

        <div class="mb-3">
          <label class="form-label fw-bold">{i18n.t.questionText}</label>
          <textarea
            class="form-control input-sketch"
            rows="2"
            placeholder="What is the capital of Austria?"
            bind:value={qText}
          ></textarea>
        </div>

        <div class="row g-2 mb-3">
          {#each [["a", qA], ["b", qB], ["c", qC], ["d", qD]] as [letter, val], idx}
            <div class="col-6">
              <label class="form-label fw-bold small">
                <span style="background:{answerColors[letter]}; padding:1px 6px; border:1.5px solid #1a1a1a; border-radius:3px;">
                  {answerLabels[letter]}
                </span>
              </label>
              <input
                class="form-control input-sketch"
                style="background:{answerColors[letter]};"
                placeholder="Answer {letter.toUpperCase()}..."
                value={val}
                oninput={(e) => {
                  if (letter === 'a') qA = e.target.value;
                  else if (letter === 'b') qB = e.target.value;
                  else if (letter === 'c') qC = e.target.value;
                  else qD = e.target.value;
                }}
              />
            </div>
          {/each}
        </div>

        <div class="mb-3">
          <label class="form-label fw-bold">{i18n.t.correctAnswer}</label>
          <div class="d-flex gap-2">
            {#each ["a","b","c","d"] as letter}
              <button
                class="btn fw-bold"
                style="
                  border: 2.5px solid #1a1a1a;
                  border-radius: 4px;
                  background: {qCorrect === letter ? '#1a1a1a' : answerColors[letter]};
                  color: {qCorrect === letter ? 'white' : '#1a1a1a'};
                  box-shadow: 2px 2px 0 #1a1a1a;
                  min-width: 48px;
                "
                onclick={() => (qCorrect = letter)}
              >
                {letter.toUpperCase()}
              </button>
            {/each}
          </div>
        </div>

        {#if questionFormError}
          <div class="text-danger small mb-2">{questionFormError}</div>
        {/if}

        <button
          class="btn btn-sketch btn-sketch-black w-100 py-2"
          onclick={handleSaveQuestion}
          disabled={savingQuestion}
        >
          {savingQuestion ? i18n.t.loading : i18n.t.saveQuestion}
        </button>
      </div>
    {/if}

    <!-- Question list -->
    {#if !quiz.questions || quiz.questions.length === 0}
      <div class="card-sketch p-4 text-center text-muted">{i18n.t.noQuestions}</div>
    {:else}
      {#each quiz.questions as q, idx (q.id)}
        <div class="card-sketch p-3 mb-3">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="fw-bold mb-2">
                <span class="badge text-bg-dark me-2">Q{idx + 1}</span>
                {q.question_text}
              </div>
              <div class="row g-1">
                {#each [["a", q.answer_a], ["b", q.answer_b], ["c", q.answer_c], ["d", q.answer_d]] as [letter, ans]}
                  <div class="col-6">
                    <div
                      style="
                        background: {answerColors[letter]};
                        border: {q.correct_answer === letter ? '2.5px solid #1a1a1a' : '1.5px solid #ccc'};
                        border-radius:4px; padding:4px 8px; font-size:0.82rem; font-weight:600;
                      "
                    >
                      {#if q.correct_answer === letter}✅{/if}
                      {letter.toUpperCase()}: {ans}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            <div class="d-flex flex-column gap-1">
              <button
                class="btn btn-sm"
                style="border:2px solid #1a1a1a; background:#dbeafe; box-shadow:2px 2px 0 #1a1a1a; font-size:0.8rem;"
                onclick={() => openEditQuestionForm(q)}
              >✏️</button>
              <button
                class="btn btn-sm"
                style="border:2px solid #1a1a1a; background:#fee2e2; box-shadow:2px 2px 0 #1a1a1a; font-size:0.8rem;"
                onclick={() => handleDeleteQuestion(q.id)}
              >🗑️</button>
            </div>
          </div>
        </div>
      {/each}
    {/if}

  {/if}
</div>
