<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { getI18n } from "$lib/i18n/index.svelte.js";
  import { getGameStore } from "$lib/stores/gameStore.svelte.js";

  const i18n = getI18n();
  const game = getGameStore();
  const code = $derived($page.url.searchParams.get("code")?.toUpperCase() ?? "");

  // ── State ──────────────────────────────────────────────────────────────
  let phase = $state("loading"); // loading | question | answered | reveal | finished

  let questionIndex = $state(0);
  let questionTotal = $state(0);
  let questionText = $state("");
  let answers = $state({ a: "", b: "", c: "", d: "" });
  let timeLeft = $state(20);
  let timeLimit = $state(20);

  let myAnswer = $state("");
  let correctAnswer = $state("");
  let distribution = $state({ a: 0, b: 0, c: 0, d: 0 });
  let scores = $state([]);
  let nextIn = $state(5);

  let timerInterval = null;
  let nextInterval = null;
  let ws = null;

  const answerColors = { a: "#dbeafe", b: "#fce7f3", c: "#dcfce7", d: "#fef9c3" };
  const answerBorders = { a: "#378ADD", b: "#D4537E", c: "#639922", d: "#BA7517" };

  // Derived: progress bar width
  let timerPercent = $derived(Math.round((timeLeft / timeLimit) * 100));
  let timerColor = $derived(timeLeft > 10 ? "#2a9d5c" : timeLeft > 5 ? "#EF9F27" : "#E24B4A");

  // ── WebSocket ──────────────────────────────────────────────────────────
  onMount(() => {
    if (!game.nickname.trim() || !code) { goto("/"); return; }

    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", code, nickname: game.nickname }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "joined") {
        phase = "loading";
      }

      if (msg.type === "question") {
        // Clear any running intervals
        clearInterval(timerInterval);
        clearInterval(nextInterval);

        questionIndex = msg.questionIndex + 1;
        questionTotal = msg.total;
        questionText = msg.text;
        answers = msg.answers;
        timeLimit = msg.timeLimit;
        timeLeft = msg.timeLimit;
        myAnswer = "";
        correctAnswer = "";
        distribution = { a: 0, b: 0, c: 0, d: 0 };
        phase = "question";

        // Client-side countdown (server drives actual timing)
        timerInterval = setInterval(() => {
          timeLeft = Math.max(0, timeLeft - 1);
          if (timeLeft === 0) clearInterval(timerInterval);
        }, 1000);
      }

      if (msg.type === "answer_confirmed") {
        myAnswer = msg.answer;
        phase = "answered";
      }

      if (msg.type === "question_result") {
        clearInterval(timerInterval);
        correctAnswer = msg.correctAnswer;
        distribution = msg.distribution;
        scores = msg.scores;
        phase = "reveal";

        // Countdown to next question
        nextIn = 5;
        clearInterval(nextInterval);
        nextInterval = setInterval(() => {
          nextIn = Math.max(0, nextIn - 1);
          if (nextIn === 0) clearInterval(nextInterval);
        }, 1000);
      }

      if (msg.type === "game_over") {
        clearInterval(timerInterval);
        clearInterval(nextInterval);
        scores = msg.scores;
        phase = "finished";
      }

      if (msg.type === "error") {
        goto("/");
      }
    };

    ws.onerror = () => goto("/");
  });

  onDestroy(() => {
    clearInterval(timerInterval);
    clearInterval(nextInterval);
    if (ws) ws.close();
  });

  function sendAnswer(letter) {
    if (phase !== "question" || myAnswer) return;
    ws.send(JSON.stringify({ type: "answer", answer: letter }));
    myAnswer = letter;
    phase = "answered";
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function totalAnswers() {
    return Object.values(distribution).reduce((s, v) => s + v, 0);
  }

  function distPercent(letter) {
    const total = totalAnswers();
    if (total === 0) return 0;
    return Math.round((distribution[letter] / total) * 100);
  }

  function myRank() {
    const idx = scores.findIndex(s => s.nickname === game.nickname);
    return idx === -1 ? "-" : idx + 1;
  }

  function myPoints() {
    const entry = scores.find(s => s.nickname === game.nickname);
    return entry ? entry.points : 0;
  }

  const medals = ["🥇", "🥈", "🥉"];
</script>

<div class="container" style="max-width:520px; padding-top:1.5rem; padding-bottom:3rem;">

  <!-- ── LOADING ─────────────────────────────────────────────────────── -->
  {#if phase === "loading"}
    <div class="text-center py-5 mt-4">
      <div class="spinner-border text-secondary mb-3" role="status"></div>
      <div class="text-muted">Warte auf Spielstart...</div>
    </div>

  <!-- ── QUESTION ───────────────────────────────────────────────────── -->
  {:else if phase === "question" || phase === "answered"}

    <!-- Header: progress + timer -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <span class="text-muted" style="font-size:0.9rem;">
        Frage {questionIndex} / {questionTotal}
      </span>
      <div style="
        width:52px; height:52px; border-radius:50%;
        border:3px solid {timerColor};
        display:flex; align-items:center; justify-content:center;
        font-size:1.3rem; font-weight:800; color:{timerColor};
        transition: color 0.5s, border-color 0.5s;
      ">
        {timeLeft}
      </div>
    </div>

    <!-- Timer bar -->
    <div style="height:6px; background:#e0e0e0; border-radius:3px; margin-bottom:16px; overflow:hidden;">
      <div style="
        height:100%; border-radius:3px;
        width:{timerPercent}%;
        background:{timerColor};
        transition: width 1s linear, background 0.5s;
      "></div>
    </div>

    <!-- Question text -->
    <div class="card-sketch p-3 mb-3" style="background:#fffef5;">
      <div style="font-size:1.1rem; font-weight:700; line-height:1.4;">
        {questionText}
      </div>
    </div>

    <!-- Answer buttons -->
    <div class="row g-2 mb-3">
      {#each ["a","b","c","d"] as letter}
        <div class="col-6">
          <button
            class="w-100 py-3 fw-bold"
            style="
              border: 2.5px solid {myAnswer === letter ? '#1a1a1a' : answerBorders[letter]};
              border-radius:8px;
              background:{myAnswer === letter ? '#1a1a1a' : answerColors[letter]};
              color:{myAnswer === letter ? 'white' : '#1a1a1a'};
              box-shadow: 3px 3px 0 {myAnswer === letter ? '#1a1a1a' : '#ccc'};
              font-size:0.95rem;
              cursor:{phase === 'answered' ? 'default' : 'pointer'};
              opacity:{phase === 'answered' && myAnswer !== letter ? '0.5' : '1'};
              transition: all 0.15s;
            "
            onclick={() => sendAnswer(letter)}
            disabled={phase === "answered"}
          >
            <span style="opacity:0.6; font-size:0.8rem;">{letter.toUpperCase()} · </span>{answers[letter]}
          </button>
        </div>
      {/each}
    </div>

    {#if phase === "answered"}
      <div class="text-center text-muted small mb-3">
        ✅ Antwort gespeichert – warte auf andere Spieler...
      </div>
    {/if}

    <!-- Live scoreboard -->
    <div class="card-sketch p-3">
      <div class="fw-bold mb-2" style="font-size:0.9rem;">🏆 Live Scoreboard</div>
      {#each scores.slice(0, 5) as s, i}
        <div class="d-flex justify-content-between py-1"
          style="border-bottom:1px dashed #eee; font-size:0.9rem;
            font-weight:{s.nickname === game.nickname ? '800' : '400'};">
          <span>{i + 1}. {s.nickname} {s.nickname === game.nickname ? "👈" : ""}</span>
          <span>{s.points.toLocaleString()} pts</span>
        </div>
      {/each}
      {#if scores.length === 0}
        <div class="text-muted small">Noch keine Punkte</div>
      {/if}
    </div>

  <!-- ── REVEAL ─────────────────────────────────────────────────────── -->
  {:else if phase === "reveal"}

    <div class="text-center mb-3">
      <span class="badge" style="background:#1a1730; font-size:1rem; padding:8px 16px;">
        Frage {questionIndex} / {questionTotal} — Auflösung
      </span>
    </div>

    <!-- Question text -->
    <div class="card-sketch p-3 mb-3" style="background:#fffef5;">
      <div style="font-size:1rem; font-weight:700;">{questionText}</div>
    </div>

    <!-- Answers with distribution bars -->
    <div class="row g-2 mb-3">
      {#each ["a","b","c","d"] as letter}
        {@const isCorrect = letter === correctAnswer}
        {@const isMine = letter === myAnswer}
        <div class="col-6">
          <div style="
            border: {isCorrect ? '3px solid #2a9d5c' : '2px solid #ccc'};
            border-radius:8px;
            background:{isCorrect ? '#dcfce7' : '#f5f5f5'};
            padding:10px;
            position:relative;
            overflow:hidden;
          ">
            <!-- Distribution bar background -->
            <div style="
              position:absolute; top:0; left:0; bottom:0;
              width:{distPercent(letter)}%;
              background:{isCorrect ? 'rgba(42,157,92,0.15)' : 'rgba(0,0,0,0.05)'};
              transition: width 0.8s ease;
            "></div>

            <div style="position:relative; z-index:1;">
              <div style="font-size:0.85rem; font-weight:700; color:{isCorrect ? '#1a6b3a' : '#666'};">
                {#if isCorrect}✅{:else if isMine && !isCorrect}❌{/if}
                {letter.toUpperCase()}: {answers[letter]}
              </div>
              <div style="font-size:0.75rem; color:#888; margin-top:2px;">
                {distribution[letter]} Spieler ({distPercent(letter)}%)
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Points feedback -->
    {#if myAnswer === correctAnswer}
      <div class="text-center mb-3 p-2 card-sketch" style="background:#dcfce7;">
        <div style="font-size:1.1rem; font-weight:800; color:#1a6b3a;">
          🎉 Richtig! +{scores.find(s => s.nickname === game.nickname)?.points
            ? "" : ""}
          Du bist auf Platz {myRank()} mit {myPoints().toLocaleString()} pts
        </div>
      </div>
    {:else if myAnswer}
      <div class="text-center mb-3 p-2 card-sketch" style="background:#fee2e2;">
        <div style="font-size:1rem; font-weight:700; color:#9b1c1c;">
          Leider falsch. Richtig war: {correctAnswer.toUpperCase()}
        </div>
      </div>
    {:else}
      <div class="text-center mb-3 p-2 card-sketch" style="background:#fef9c3;">
        <div style="font-size:1rem; font-weight:700;">Keine Antwort gegeben.</div>
      </div>
    {/if}

    <!-- Scoreboard -->
    <div class="card-sketch p-3 mb-3">
      <div class="fw-bold mb-2">🏆 Aktuelles Scoreboard</div>
      {#each scores as s, i}
        <div class="d-flex justify-content-between py-1"
          style="border-bottom:1px dashed #eee; font-size:0.9rem;
            font-weight:{s.nickname === game.nickname ? '800' : '400'};">
          <span>{i + 1}. {s.nickname} {s.nickname === game.nickname ? "👈" : ""}</span>
          <span>{s.points.toLocaleString()} pts</span>
        </div>
      {/each}
    </div>

    <div class="text-center text-muted small">
      Nächste Frage in {nextIn} Sekunde{nextIn === 1 ? "" : "n"}...
    </div>

  <!-- ── FINISHED ───────────────────────────────────────────────────── -->
  {:else if phase === "finished"}

    <div class="text-center mb-4 mt-2">
      <div style="font-size:3.5rem;">🏆</div>
      <h2 style="font-weight:800; border-bottom:3px solid #1a1a1a; display:inline-block; padding-bottom:4px;">
        Game Over!
      </h2>
    </div>

    <!-- Podium (top 3) -->
    {#if scores.length >= 2}
      <div class="d-flex align-items-end justify-content-center gap-3 mb-4">
        <!-- 2nd -->
        {#if scores[1]}
          <div class="text-center">
            <div style="font-size:1.4rem;">🥈</div>
            <div style="
              height:70px; width:80px;
              background:#e0e7ff; border:2.5px solid #1a1a1a;
              border-radius:6px 6px 0 0; box-shadow:3px 0 0 #1a1a1a;
              display:flex; align-items:center; justify-content:center;
              font-size:1.5rem; font-weight:800;">2</div>
            <div style="font-size:0.85rem; font-weight:700; margin-top:4px;">{scores[1].nickname}</div>
            <div style="font-size:0.75rem; color:#888;">{scores[1].points.toLocaleString()} pts</div>
          </div>
        {/if}
        <!-- 1st -->
        {#if scores[0]}
          <div class="text-center">
            <div style="font-size:1.4rem;">🥇</div>
            <div style="
              height:100px; width:80px;
              background:#fef9c3; border:2.5px solid #1a1a1a;
              border-radius:6px 6px 0 0; box-shadow:3px 0 0 #1a1a1a;
              display:flex; align-items:center; justify-content:center;
              font-size:1.5rem; font-weight:800;">1</div>
            <div style="font-size:0.85rem; font-weight:700; margin-top:4px;">{scores[0].nickname}</div>
            <div style="font-size:0.75rem; color:#888;">{scores[0].points.toLocaleString()} pts</div>
          </div>
        {/if}
        <!-- 3rd -->
        {#if scores[2]}
          <div class="text-center">
            <div style="font-size:1.4rem;">🥉</div>
            <div style="
              height:50px; width:80px;
              background:#dcfce7; border:2.5px solid #1a1a1a;
              border-radius:6px 6px 0 0; box-shadow:3px 0 0 #1a1a1a;
              display:flex; align-items:center; justify-content:center;
              font-size:1.5rem; font-weight:800;">3</div>
            <div style="font-size:0.85rem; font-weight:700; margin-top:4px;">{scores[2].nickname}</div>
            <div style="font-size:0.75rem; color:#888;">{scores[2].points.toLocaleString()} pts</div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Full leaderboard -->
    <div class="card-sketch p-3 mb-4">
      <div class="fw-bold mb-2">Gesamtergebnis</div>
      {#each scores as s, i}
        <div class="d-flex align-items-center gap-2 py-2"
          style="border-bottom:1px dashed #ccc;
            background:{s.nickname === game.nickname ? '#fffef5' : 'transparent'};
            padding-left:8px; border-radius:4px;">
          <span style="width:28px; font-weight:800; font-size:1rem;">
            {i < 3 ? medals[i] : `${i+1}.`}
          </span>
          <span style="flex:1; font-weight:{s.nickname === game.nickname ? '800' : '400'};">
            {s.nickname} {s.nickname === game.nickname ? "👈" : ""}
          </span>
          <span style="font-weight:700;">{s.points.toLocaleString()} pts</span>
          <span class="text-muted small">({s.correct} ✅)</span>
        </div>
      {/each}
    </div>

    <button class="btn btn-sketch btn-sketch-black w-100 py-2" onclick={() => goto("/")}>
      ← Zurück zur Startseite
    </button>

  {/if}
</div>