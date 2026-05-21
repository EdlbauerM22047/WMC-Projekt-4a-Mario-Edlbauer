<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";
  import * as api from "$lib/api.js";

  const i18n = getI18n();
  const game = getGameStore();

  // State with Svelte 5 runes
  let quizzes = $state([]);
  let loading = $state(true);
  let error = $state("");

  // Create quiz form state
  let showCreateForm = $state(false);
  let newTitle = $state("");
  let newDescription = $state("");
  let creating = $state(false);
  let formError = $state("");

  // Derived: total questions across all quizzes
  let totalQuestions = $derived(quizzes.reduce((sum, q) => sum + (q.question_count || 0), 0));

  onMount(async () => {
    await loadQuizzes();
  });

  async function loadQuizzes() {
    try {
      loading = true;
      error = "";
      quizzes = await api.getQuizzes();
    } catch (e) {
      error = i18n.t.error;
    } finally {
      loading = false;
    }
  }

  async function handleCreate() {
    formError = "";
    if (!newTitle.trim()) {
      formError = "Title is required!";
      return;
    }
    try {
      creating = true;
      const quiz = await api.createQuiz({ title: newTitle.trim(), description: newDescription.trim() });
      goto(`/quiz/${quiz.id}`);
    } catch (e) {
      formError = e.message;
    } finally {
      creating = false;
    }
  }

  async function handleDelete(quiz) {
    if (!confirm(`${i18n.t.deleteConfirm} "${quiz.title}"`)) return;
    try {
      await api.deleteQuiz(quiz.id);
      quizzes = quizzes.filter(q => q.id !== quiz.id);
    } catch (e) {
      alert(i18n.t.error);
    }
  }

  function handleHost(quiz) {
    game.currentQuizId = quiz.id;
    goto(`/lobby/host?quizId=${quiz.id}`);
  }
</script>

<div class="container" style="max-width:600px; padding-top:2rem; padding-bottom:3rem;">

  <!-- Back link -->
  <a href="/" class="text-decoration-none text-muted small">← {i18n.t.back}</a>

  <!-- Header with stats -->
  <div class="d-flex align-items-center justify-content-between mt-3 mb-3">
    <h2 style="font-weight:800; border-bottom:3px solid #1a1a1a;">{i18n.t.myQuizzes}</h2>
    <button
      class="btn btn-sketch btn-sketch-black px-3 py-2"
      onclick={() => { showCreateForm = !showCreateForm; newTitle = ""; newDescription = ""; formError = ""; }}
    >
      {showCreateForm ? i18n.t.cancel : i18n.t.newQuiz}
    </button>
  </div>

  <!-- Stats row -->
  {#if !loading}
    <div class="row g-2 mb-4">
      <div class="col-4">
        <div class="card-sketch p-3 text-center">
          <div style="font-size:1.8rem; font-weight:800;">{quizzes.length}</div>
          <div class="text-muted small">{i18n.t.quizzes}</div>
        </div>
      </div>
      <div class="col-4">
        <div class="card-sketch p-3 text-center">
          <div style="font-size:1.8rem; font-weight:800;">{totalQuestions}</div>
          <div class="text-muted small">{i18n.t.questions}</div>
        </div>
      </div>
      <div class="col-4">
        <div class="card-sketch p-3 text-center">
          <div style="font-size:1.8rem; font-weight:800;">
            {quizzes.reduce((s, q) => s + (q.games_played || 0), 0)}
          </div>
          <div class="text-muted small">{i18n.t.gamesPlayed}</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Create form -->
  {#if showCreateForm}
    <div class="card-sketch p-4 mb-4">
      <h5 class="fw-bold mb-3">{i18n.t.newQuiz}</h5>
      <div class="mb-3">
        <label class="form-label fw-bold">{i18n.t.quizTitle}</label>
        <input
          class="form-control input-sketch"
          placeholder="e.g. Geography Masterclass"
          bind:value={newTitle}
          maxlength="80"
        />
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">{i18n.t.quizDescription}</label>
        <textarea
          class="form-control input-sketch"
          rows="2"
          placeholder="Short description..."
          bind:value={newDescription}
          maxlength="200"
        ></textarea>
      </div>
      {#if formError}
        <div class="text-danger small mb-2">{formError}</div>
      {/if}
      <button
        class="btn btn-sketch btn-sketch-black w-100 py-2"
        onclick={handleCreate}
        disabled={creating}
      >
        {creating ? i18n.t.loading : i18n.t.createQuiz}
      </button>
    </div>
  {/if}

  <!-- Quiz list -->
  {#if loading}
    <div class="text-center py-5 text-muted">{i18n.t.loading}</div>
  {:else if error}
    <div class="alert alert-danger">{error}</div>
  {:else if quizzes.length === 0}
    <div class="card-sketch p-4 text-center text-muted">
      {i18n.t.noQuizzes}
    </div>
  {:else}
    {#each quizzes as quiz (quiz.id)}
      <div class="card-sketch p-3 mb-3">
        <div class="d-flex align-items-start gap-3">
          <!-- Icon -->
          <div style="font-size:1.8rem; line-height:1;">📋</div>
          <!-- Info -->
          <div class="flex-grow-1">
            <div class="fw-bold" style="font-size:1.05rem;">{quiz.title}</div>
            {#if quiz.description}
              <div class="text-muted small">{quiz.description}</div>
            {/if}
            <div class="text-muted small mt-1">
              {quiz.question_count} {i18n.t.questions}
            </div>
          </div>
          <!-- Actions -->
          <div class="d-flex flex-column gap-2">
            <button
              class="btn btn-sketch btn-sketch-black btn-sm px-2 py-1"
              style="font-size:0.8rem;"
              onclick={() => handleHost(quiz)}
            >
              {i18n.t.hostGame}
            </button>
            <button
              class="btn btn-sketch btn-sketch-outline btn-sm px-2 py-1"
              style="font-size:0.8rem; background:#dbeafe !important;"
              onclick={() => goto(`/quiz/${quiz.id}`)}
            >
              ✏️ {i18n.t.edit}
            </button>
            <button
              class="btn btn-sketch btn-sketch-outline btn-sm px-2 py-1"
              style="font-size:0.8rem; background:#fee2e2 !important;"
              onclick={() => handleDelete(quiz)}
            >
              🗑️ {i18n.t.delete}
            </button>
          </div>
        </div>
      </div>
    {/each}
  {/if}

</div>
