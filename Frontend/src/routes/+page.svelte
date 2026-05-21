
<script>
  import { goto } from "$app/navigation";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";

  const i18n = getI18n();
  const game = getGameStore();

  // Local state with Svelte 5 runes
  let gameCode = $state("");
  let nicknameError = $state("");
  let codeError = $state("");

  function handleJoin() {
    nicknameError = "";
    codeError = "";

    if (!game.nickname.trim()) {
      nicknameError = i18n.t.noNickname;
      return;
    }
    if (!gameCode.trim()) {
      codeError = i18n.t.noCode;
      return;
    }

    game.currentGameCode = gameCode.trim().toUpperCase();
    goto(`/lobby?code=${game.currentGameCode}`);
  }

  function handleCreate() {
    if (!game.nickname.trim()) {
      nicknameError = i18n.t.noNickname;
      return;
    }
    goto("/quiz");
  }
</script>

<div class="container" style="max-width:420px; padding-top:2.5rem;">

  <!-- App title -->
  <div class="text-center mb-4">
    <h1 style="font-size:2.8rem; font-weight:800; border-bottom:3px solid #1a1a1a; display:inline-block; padding-bottom:4px;">
      ⚡ QuizLive
    </h1>
    <p class="text-muted mt-1">{i18n.t.appSubtitle}</p>
  </div>

  <!-- Main card -->
  <div class="card-sketch p-4">

    <!-- Nickname -->
    <div class="mb-3">
      <label class="form-label fw-bold">{i18n.t.yourNickname}</label>
      <input
        class="form-control input-sketch"
        placeholder={i18n.t.nicknamePlaceholder}
        bind:value={game.nickname}
        maxlength="20"
      />
      {#if nicknameError}
        <div class="text-danger small mt-1">{nicknameError}</div>
      {/if}
    </div>

    <hr style="border-top:2px dashed #aaa;" />

    <!-- Join game -->
    <div class="mb-3">
      <label class="form-label fw-bold">{i18n.t.gameCode}</label>
      <input
        class="form-control input-sketch text-center"
        style="font-size:1.4rem; letter-spacing:6px; font-weight:700;"
        placeholder={i18n.t.gameCodePlaceholder}
        bind:value={gameCode}
        maxlength="5"
        oninput={() => (gameCode = gameCode.toUpperCase())}
      />
      {#if codeError}
        <div class="text-danger small mt-1">{codeError}</div>
      {/if}
    </div>

    <button class="btn btn-sketch btn-sketch-black w-100 mb-3 py-2" onclick={handleJoin}>
      {i18n.t.joinGame} →
    </button>

    <hr style="border-top:2px dashed #aaa;" />

    <button class="btn btn-sketch btn-sketch-outline w-100 py-2" onclick={handleCreate}>
      {i18n.t.createHostQuiz}
    </button>

  </div>
</div>
