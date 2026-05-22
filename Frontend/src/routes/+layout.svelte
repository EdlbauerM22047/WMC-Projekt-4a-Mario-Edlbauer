<script>
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";

  const i18n = getI18n();
  const game = getGameStore();
</script>

<nav class="navbar navbar-dark" style="background:#1a1730;">
  <div class="container-fluid px-3">
    <a class="navbar-brand fw-bold" href="/" style="font-size:1.3rem; color:#CECBF6;">
      ⚡ QuizLive
    </a>
    <div class="d-flex align-items-center gap-2">
      {#if game.nickname}
        <span class="badge rounded-pill" style="background:#534AB7; font-size:0.8rem;">
          👤 {game.nickname}
        </span>
      {/if}
      <button
        class="btn btn-sm"
        style="border:1.5px solid #534AB7; color:#AFA9EC; font-size:0.85rem;"
        onclick={() => i18n.toggle()}
      >
        {i18n.lang === "de" ? "🇬🇧 EN" : "🇦🇹 DE"}
      </button>
    </div>
  </div>
</nav>

<slot />

<style>
  :global(body) { background: #f5f0e8; min-height: 100vh; }
  :global(.card-sketch) {
    border: 2.5px solid #1a1a1a;
    border-radius: 6px;
    box-shadow: 4px 4px 0 #1a1a1a;
    background: white;
  }
  :global(.btn-sketch) {
    border: 2.5px solid #1a1a1a !important;
    border-radius: 4px !important;
    box-shadow: 3px 3px 0 #1a1a1a;
    font-weight: 600;
    transition: all 0.1s;
  }
  :global(.btn-sketch:active) { box-shadow: 1px 1px 0 #1a1a1a !important; transform: translate(2px,2px); }
  :global(.btn-sketch-black) { background: #1a1a1a !important; color: white !important; }
  :global(.btn-sketch-outline) { background: white !important; color: #1a1a1a !important; }
  :global(.input-sketch) {
    border: 2.5px solid #1a1a1a !important;
    border-radius: 4px !important;
    background: #fffef5 !important;
  }
  :global(.input-sketch:focus) { box-shadow: 3px 3px 0 #1a1a1a !important; outline: none; }
</style>