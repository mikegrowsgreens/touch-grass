// Touch Grass — the game gate. Win one to earn a pause.
// Each game calls opts.onWin() or opts.onLose(). Runner picks a random game,
// never repeating the one just lost.

(function () {
  const SENTENCES = [
    "I am not giving anything up. I am getting my time back.",
    "There is nothing on the feed that my life is missing.",
    "I do not need to escape into a screen to feel good.",
    "Scrolling was never the reward. Stopping is the reward.",
    "I am free, and free people do not beg an algorithm for crumbs."
  ];

  const EMOJIS = ["🌿", "🌞", "🦆", "🍉", "🛶", "🌵", "🪴", "🐢"];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- 1. Typing gauntlet ----------
  function typingGame(arena, ui, opts) {
    ui.title.textContent = "Typing gauntlet ⌨️";
    ui.intro.textContent = "Type the sentence perfectly. One wrong character and it resets. Mean? Yes.";

    const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
    arena.innerHTML = "";

    const target = document.createElement("div");
    target.className = "type-target";
    const input = document.createElement("input");
    input.className = "type-input";
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "Start typing…";

    function render(typed) {
      target.innerHTML = "";
      for (let i = 0; i < sentence.length; i++) {
        const span = document.createElement("span");
        span.textContent = sentence[i];
        if (i < typed.length) span.className = typed[i] === sentence[i] ? "ok" : "bad";
        target.appendChild(span);
      }
    }

    render("");
    arena.appendChild(target);
    arena.appendChild(input);
    input.focus();

    input.addEventListener("input", () => {
      const typed = input.value;
      if (!sentence.startsWith(typed)) {
        input.value = "";
        render("");
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 350);
        return;
      }
      render(typed);
      if (typed === sentence) opts.onWin();
    });
  }

  // ---------- 2. Memory match ----------
  function memoryGame(arena, ui, opts) {
    const MAX_ATTEMPTS = 16;
    ui.title.textContent = "Memory match 🧠";
    ui.intro.textContent = `Match all 8 pairs in ${MAX_ATTEMPTS} tries or start over.`;

    arena.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "mem-grid";
    const status = document.createElement("div");
    status.className = "mem-status";

    const deck = shuffle(EMOJIS.concat(EMOJIS));
    let first = null;
    let lock = false;
    let attempts = 0;
    let matched = 0;

    function updateStatus() {
      status.textContent = `Tries: ${attempts}/${MAX_ATTEMPTS} · Pairs: ${matched}/8`;
    }

    deck.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.className = "mem-card";
      btn.textContent = emoji;
      btn.addEventListener("click", () => {
        if (lock || btn.classList.contains("flipped") || btn.classList.contains("matched")) return;
        btn.classList.add("flipped");
        if (!first) {
          first = btn;
          return;
        }
        attempts++;
        updateStatus();
        if (first.textContent === btn.textContent) {
          first.classList.add("matched");
          btn.classList.add("matched");
          first.classList.remove("flipped");
          btn.classList.remove("flipped");
          first = null;
          matched++;
          if (matched === 8) opts.onWin();
        } else {
          lock = true;
          const a = first;
          first = null;
          setTimeout(() => {
            a.classList.remove("flipped");
            btn.classList.remove("flipped");
            lock = false;
            if (attempts >= MAX_ATTEMPTS && matched < 8) opts.onLose();
          }, 650);
          return;
        }
        if (attempts >= MAX_ATTEMPTS && matched < 8) opts.onLose();
      });
      grid.appendChild(btn);
    });

    updateStatus();
    arena.appendChild(grid);
    arena.appendChild(status);
  }

  // ---------- 3. Reaction timer ----------
  function reactionGame(arena, ui, opts) {
    const ROUNDS = 5;
    const WINDOW_MS = 1000;
    ui.title.textContent = "Whack the duck 🦆";
    ui.intro.textContent = `Click the duck within 1 second, ${ROUNDS} times in a row. Too slow = start over.`;

    arena.innerHTML = "";
    const field = document.createElement("div");
    field.className = "react-arena";
    const status = document.createElement("div");
    status.className = "react-status";
    arena.appendChild(field);
    arena.appendChild(status);

    let round = 0;
    let timer = null;
    let dead = false;

    function updateStatus() {
      status.textContent = `Ducks whacked: ${round}/${ROUNDS}`;
    }

    function spawn() {
      if (dead) return;
      const delay = 600 + Math.random() * 1200;
      setTimeout(() => {
        if (dead) return;
        const duck = document.createElement("button");
        duck.className = "react-target";
        duck.textContent = "🦆";
        const maxX = field.clientWidth - 60;
        const maxY = field.clientHeight - 60;
        duck.style.left = Math.random() * maxX + "px";
        duck.style.top = Math.random() * maxY + "px";
        duck.addEventListener("click", () => {
          clearTimeout(timer);
          duck.remove();
          round++;
          updateStatus();
          if (round >= ROUNDS) {
            dead = true;
            opts.onWin();
          } else {
            spawn();
          }
        });
        field.appendChild(duck);
        timer = setTimeout(() => {
          if (dead) return;
          dead = true;
          duck.remove();
          opts.onLose();
        }, WINDOW_MS);
      }, delay);
    }

    updateStatus();
    spawn();
  }

  const GAMES = [
    { key: "typing", run: typingGame },
    { key: "memory", run: memoryGame },
    { key: "reaction", run: reactionGame }
  ];

  window.TouchGrassGames = {
    // Starts a random game (never `avoidKey`). Returns the chosen key.
    startRandom(arena, ui, opts, avoidKey) {
      const pool = GAMES.filter((g) => g.key !== avoidKey);
      const game = pool[Math.floor(Math.random() * pool.length)];
      game.run(arena, ui, opts);
      return game.key;
    }
  };
})();
