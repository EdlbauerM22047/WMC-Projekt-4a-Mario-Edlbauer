<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";

  const i18n = getI18n();
  const game = getGameStore();

  const quizId = $derived($page.url.searchParams.get("quizId"));

  let code = $state("");
  let quizTitle = $state("");
  let players = $state([]);
  let loading = $state(true);
  let error = $state("");
  let starting = $state(false);

  let ws = null;

  onMount(async () => {
    if (!game.nickname.trim()) { goto("/"); return; }

    // 1. Create room via REST
    try {
      const res = await fetch("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, nickname: game.nickname })
      });
      if (!res.ok) { error = "Raum konnte nicht erstellt werden."; loading = false; return; }
      const data = await res.json();
      code = data.code;
      quizTitle = data.quizTitle;
      game.currentGameCode = code;
    } catch (e) {
      error = "Backend nicht erreichbar.";
      loading = false;
      return;
    }

    // 2. Connect via WebSocket
    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "host_join", code, nickname: game.nickname }));
      loading = false;
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "joined") {
        players = msg.room.players;
      }
      if (msg.type === "player_joined" || msg.type === "player_left") {
        players = msg.players;
      }
      if (msg.type === "game_started") {
        goto(`/game?code=${code}`);
      }
    };

    ws.onerror = () => { error = "WebSocket Fehler."; };
  });

  onDestroy(() => { if (ws) ws.close(); });

  function handleStart() {
    if (players.length < 1) return;
    starting = true;
    ws.send(JSON.stringify({ type: "start_game" }));
  }
</script>

<div class="container" style="max-width:500px; padding-top:2rem; padding-bottom:3rem;">
  <a href="/quiz" class="text-decoration-none text-muted small">← Zurück</a>

  {#if loading}
    <div class="text-center py-5 text-muted mt-4">Lobby wird erstellt...</div>
  {:else if error}
    <div class="alert alert-danger mt-4">{error}</div>
  {:else}

    <div class="text-center mt-4 mb-4">
      <h2 style="font-weight:800; border-bottom:3px solid #1a1a1a; display:inline-block; padding-bottom:4px;">
        {quizTitle}
      </h2>
      <p class="text-muted">Teile diesen Code mit deinen Spielern:</p>
      <div style="font-size:3rem; font-weight:800; letter-spacing:8px; border:3px solid #1a1a1a;
        border-radius:8px; padding:12px 24px; display:inline-block;
        background:#fffef5; box-shadow:4px 4px 0 #1a1a1a;">
        {code}
      </div>
    </div>

    <!-- Player list -->
    <div class="card-sketch p-3 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="fw-bold">Spieler ({players.length})</span>
        <span class="text-muted small">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2a9d5c; margin-right:4px;"></span>
          wartet auf Spieler...
        </span>
      </div>

      {#each players as player (player.id ?? player.nickname)}
        <div class="d-flex align-items-center gap-2 py-2"
          style="border-bottom: 1px dashed #ccc;">
          <div style="width:32px; height:32px; border-radius:50%; background:#1a1730;
            color:white; display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700; flex-shrink:0;">
            {player.nickname.slice(0,2).toUpperCase()}
          </div>
          <span style="font-size:1rem;">{player.nickname}</span>
          {#if player.isHost}
            <span class="badge text-bg-dark ms-auto">HOST</span>
          {/if}
        </div>
      {/each}

      {#if players.length === 0}
        <div class="text-muted text-center py-2 small">Noch keine Spieler...</div>
      {/if}
    </div>

    <button
      class="btn btn-sketch btn-sketch-black w-100 py-2"
      onclick={handleStart}
      disabled={starting || players.length < 1}
    >
      {starting ? "Starte..." : "▶ Spiel starten"}
    </button>
    <div class="text-center text-muted small mt-2">
      Nur du als Host siehst diesen Button
    </div>

  {/if}
</div>