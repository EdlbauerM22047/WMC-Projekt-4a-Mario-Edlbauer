<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";

  const i18n = getI18n();
  const game = getGameStore();

  const code = $derived($page.url.searchParams.get("code")?.toUpperCase() ?? "");

  let quizTitle = $state("");
  let players = $state([]);
  let loading = $state(true);
  let error = $state("");

  let ws = null;

  onMount(() => {
    if (!game.nickname.trim()) { goto("/"); return; }
    if (!code) { goto("/"); return; }

    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        code,
        nickname: game.nickname
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "joined") {
        quizTitle = msg.room.quizTitle;
        players = msg.room.players;
        loading = false;
      }
      if (msg.type === "player_joined" || msg.type === "player_left") {
        players = msg.players;
      }
      if (msg.type === "game_started") {
        goto(`/game?code=${code}`);
      }
      if (msg.type === "error") {
        error = msg.message === "Room not found"
          ? "Kein Spiel mit diesem Code gefunden."
          : msg.message;
        loading = false;
      }
    };

    ws.onerror = () => {
      error = "Verbindung fehlgeschlagen. Ist das Backend gestartet?";
      loading = false;
    };
  });

  onDestroy(() => { if (ws) ws.close(); });
</script>

<div class="container" style="max-width:500px; padding-top:2rem; padding-bottom:3rem;">
  <a href="/" class="text-decoration-none text-muted small">← Zurück</a>

  {#if loading}
    <div class="text-center py-5 mt-4">
      <div class="text-muted mb-3">Verbinde mit Lobby <strong>{code}</strong>...</div>
      <div class="spinner-border text-secondary" role="status"></div>
    </div>
  {:else if error}
    <div class="alert alert-danger mt-4">{error}</div>
    <a href="/" class="btn btn-sketch btn-sketch-outline w-100 mt-2">← Zurück zur Startseite</a>
  {:else}

    <div class="text-center mt-4 mb-4">
      <h2 style="font-weight:800; border-bottom:3px solid #1a1a1a; display:inline-block; padding-bottom:4px;">
        {quizTitle}
      </h2>
      <p class="text-muted mt-2">Warte auf den Host...</p>
    </div>

    <!-- Code anzeigen -->
    <div class="text-center mb-4">
      <div class="text-muted small mb-1">Game-Code:</div>
      <div style="font-size:2rem; font-weight:800; letter-spacing:6px; border:2.5px solid #1a1a1a;
        border-radius:6px; padding:8px 20px; display:inline-block;
        background:#fffef5; box-shadow:3px 3px 0 #1a1a1a;">
        {code}
      </div>
    </div>

    <!-- Player list -->
    <div class="card-sketch p-3 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="fw-bold">Spieler ({players.length})</span>
        <span class="text-muted small">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%;
            background:#2a9d5c; margin-right:4px; animation: pulse 1.5s infinite;"></span>
          live
        </span>
      </div>

      {#each players as player (player.id ?? player.nickname)}
        <div class="d-flex align-items-center gap-2 py-2" style="border-bottom:1px dashed #ccc;">
          <div style="width:32px; height:32px; border-radius:50%; background:#1a1730;
            color:white; display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700; flex-shrink:0;">
            {player.nickname.slice(0,2).toUpperCase()}
          </div>
          <span style="font-size:1rem;">{player.nickname}</span>
          {#if player.isHost}
            <span class="badge text-bg-dark ms-auto">HOST</span>
          {/if}
          {#if player.nickname === game.nickname && !player.isHost}
            <span class="badge ms-auto" style="background:#534AB7;">Du</span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="text-center text-muted small">
      Das Spiel startet automatisch, sobald der Host es beginnt.
    </div>
<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";

  const i18n = getI18n();
  const game = getGameStore();
  const code = $derived($page.url.searchParams.get("code")?.toUpperCase() ?? "");

  let quizTitle = $state("");
  let players = $state([]);
  let loading = $state(true);
  let error = $state("");
  let ws = null;

  onMount(() => {
    if (!game.nickname.trim()) { goto("/"); return; }
    if (!code) { goto("/"); return; }

    ws = new WebSocket("ws://localhost:3000");
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code, nickname: game.nickname }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "joined") {
        quizTitle = msg.room.quizTitle;
        players = msg.room.players;
        loading = false;
      }
      if (msg.type === "player_joined" || msg.type === "player_left") players = msg.players;
      if (msg.type === "game_started") goto(`/game?code=${code}`);
      if (msg.type === "error") {
        error = msg.message === "Room not found" ? i18n.t.roomNotFound : msg.message;
        loading = false;
      }
    };
    ws.onerror = () => { error = i18n.t.connectionFailed; loading = false; };
  });

  onDestroy(() => { if (ws) ws.close(); });
</script>

<div class="container" style="max-width:500px; padding-top:2rem; padding-bottom:3rem;">
  <a href="/" class="text-decoration-none text-muted small">{i18n.t.back}</a>

  {#if loading && !error}
    <div class="text-center py-5 mt-4">
      <div class="spinner-border text-secondary mb-3" role="status"></div>
      <div class="text-muted">{i18n.t.connectingToLobby} <strong>{code}</strong>...</div>
    </div>
  {:else if error}
    <div class="alert alert-danger mt-4">{error}</div>
    <a href="/" class="btn btn-sketch btn-sketch-outline w-100 mt-2">{i18n.t.backToHome}</a>
  {:else}
    <div class="text-center mt-4 mb-4">
      <h2 style="font-weight:800; border-bottom:3px solid #1a1a1a; display:inline-block; padding-bottom:4px;">
        {quizTitle}
      </h2>
      <p class="text-muted mt-2">{i18n.t.waitingForHost}</p>
    </div>

    <div class="text-center mb-4">
      <div class="text-muted small mb-1">{i18n.t.gameCode}:</div>
      <div style="font-size:2rem; font-weight:800; letter-spacing:6px;
        border:2.5px solid #1a1a1a; border-radius:6px; padding:8px 20px;
        display:inline-block; background:#fffef5; box-shadow:3px 3px 0 #1a1a1a;">
        {code}
      </div>
    </div>

    <div class="card-sketch p-3 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="fw-bold">{i18n.t.players} ({players.length})</span>
        <span class="text-muted small">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%;
            background:#2a9d5c; margin-right:4px; animation: pulse 1.5s infinite;"></span>
          {i18n.t.live}
        </span>
      </div>
      {#each players as player (player.id ?? player.nickname)}
        <div class="d-flex align-items-center gap-2 py-2" style="border-bottom:1px dashed #ccc;">
          <div style="width:32px; height:32px; border-radius:50%; background:#1a1730;
            color:white; display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700; flex-shrink:0;">
            {player.nickname.slice(0,2).toUpperCase()}
          </div>
          <span>{player.nickname}</span>
          {#if player.isHost}
            <span class="badge text-bg-dark ms-auto">{i18n.t.hostBadge}</span>
          {:else if player.nickname === game.nickname}
            <span class="badge ms-auto" style="background:#534AB7;">{i18n.t.youBadge}</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="text-center text-muted small">{i18n.t.gameStartsAuto}</div>
  {/if}
</div>

<style>
  @keyframes pulse { 0%, 100% { opacity:1; } 50% { opacity:0.3; } }
</style>
  {/if}
</div>

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>