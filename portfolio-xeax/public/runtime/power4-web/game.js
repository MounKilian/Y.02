(() => {
  "use strict";

  const DIFFICULTIES = {
    easy:   { name: "Facile",    rows: 6, cols: 7 },
    normal: { name: "Normal",    rows: 6, cols: 7 },
    hard:   { name: "Difficile", rows: 8, cols: 9 },
  };

  const EMPTY = 0, P1 = 1, P2 = 2;

  /** @typedef {{ board:number[][], rows:number, cols:number, current:number, state:"playing"|"won"|"draw", winner:number, p1:string, p2:string, difficulty:string, winLine:number[][] }} Game */

  /** @returns {Game} */
  function newGame(difficultyKey, p1, p2) {
    const cfg = DIFFICULTIES[difficultyKey] || DIFFICULTIES.easy;
    const board = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(EMPTY));
    return {
      board,
      rows: cfg.rows,
      cols: cfg.cols,
      current: P1,
      state: "playing",
      winner: EMPTY,
      p1: p1 || "Joueur 1",
      p2: p2 || "Joueur 2",
      difficulty: difficultyKey in DIFFICULTIES ? difficultyKey : "easy",
      winLine: [],
    };
  }

  function isValidMove(g, col) {
    if (g.state !== "playing") return false;
    if (col < 0 || col >= g.cols) return false;
    return g.board[0][col] === EMPTY;
  }

  function isFull(g) {
    for (let c = 0; c < g.cols; c++) if (g.board[0][c] === EMPTY) return false;
    return true;
  }

  function checkDirection(g, row, col, dr, dc, player) {
    const line = [[row, col]];
    for (let i = 1; i < 4; i++) {
      const r = row + i * dr, c = col + i * dc;
      if (r < 0 || r >= g.rows || c < 0 || c >= g.cols) break;
      if (g.board[r][c] !== player) break;
      line.push([r, c]);
    }
    for (let i = 1; i < 4; i++) {
      const r = row - i * dr, c = col - i * dc;
      if (r < 0 || r >= g.rows || c < 0 || c >= g.cols) break;
      if (g.board[r][c] !== player) break;
      line.unshift([r, c]);
    }
    return line.length >= 4 ? line : null;
  }

  function checkWin(g) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const p = g.board[r][c];
        if (p === EMPTY) continue;
        for (const [dr, dc] of dirs) {
          const line = checkDirection(g, r, c, dr, dc, p);
          if (line) {
            g.state = "won";
            g.winner = p;
            g.winLine = line;
            return true;
          }
        }
      }
    }
    return false;
  }

  function makeMove(g, col) {
    if (!isValidMove(g, col)) return false;
    for (let r = g.rows - 1; r >= 0; r--) {
      if (g.board[r][col] === EMPTY) {
        g.board[r][col] = g.current;
        break;
      }
    }
    if (checkWin(g)) return true;
    if (isFull(g)) {
      g.state = "draw";
      return true;
    }
    g.current = 3 - g.current;
    return true;
  }

  // ============ UI ============

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /** @type {Game | null} */
  let game = null;

  const screens = {
    start: $("#screen-start"),
    game: $("#screen-game"),
    victory: $("#screen-victory"),
  };

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
  }

  function renderGame() {
    const status = $("#game-status");
    if (game.state === "playing") {
      const player = game.current === P1 ? game.p1 : game.p2;
      status.innerHTML = `
        <h2>Tour de <span class="player-${game.current}">${escape(player)}</span></h2>
        <p class="muted">À vous de jouer.</p>
      `;
    } else if (game.state === "won") {
      const w = game.winner === P1 ? game.p1 : game.p2;
      status.innerHTML = `<h2>🎉 <span class="player-${game.winner}">${escape(w)}</span> a gagné !</h2>`;
    } else if (game.state === "draw") {
      status.innerHTML = `<h2>🤝 Match nul</h2><p class="muted">Le plateau est plein.</p>`;
    }

    const colsEl = $("#column-buttons");
    if (game.state === "playing") {
      colsEl.style.display = "";
      colsEl.style.gridTemplateColumns = `repeat(${game.cols}, clamp(40px, 9vw, 64px))`;
      colsEl.innerHTML = "";
      for (let c = 0; c < game.cols; c++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "column-btn";
        btn.textContent = `↓ ${c + 1}`;
        btn.disabled = !isValidMove(game, c);
        btn.addEventListener("click", () => onMove(c));
        colsEl.appendChild(btn);
      }
    } else {
      colsEl.style.display = "none";
    }

    const board = $("#board");
    board.innerHTML = "";
    const winSet = new Set(game.winLine.map(([r, c]) => `${r},${c}`));
    for (let r = 0; r < game.rows; r++) {
      const row = document.createElement("div");
      row.className = "board-row";
      row.style.gridTemplateColumns = `repeat(${game.cols}, clamp(40px, 9vw, 64px))`;
      for (let c = 0; c < game.cols; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        if (winSet.has(`${r},${c}`)) cell.classList.add("win");
        const tok = document.createElement("div");
        const v = game.board[r][c];
        tok.className = "token " + (v === P1 ? "player1" : v === P2 ? "player2" : "empty");
        cell.appendChild(tok);
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
  }

  function renderVictory() {
    const c = $("#victory-content");
    if (game.state === "won") {
      const w = game.winner === P1 ? game.p1 : game.p2;
      c.innerHTML = `
        <div class="victory-section">
          <h2 class="victory-title">🎉 VICTOIRE ! 🎉</h2>
          <div class="winner-card player-${game.winner}">
            <h3>${escape(w)}</h3>
            <p>remporte la partie !</p>
            <div class="winner-trophy">🏆</div>
          </div>
          <p class="muted">Difficulté : ${DIFFICULTIES[game.difficulty].name} — grille ${game.rows}×${game.cols}</p>
        </div>
      `;
    } else {
      c.innerHTML = `
        <div class="draw-section">
          <h2 class="draw-title">🤝 MATCH NUL 🤝</h2>
          <p>Excellent jeu de la part des deux joueurs.</p>
          <p><strong>${escape(game.p1)}</strong> et <strong>${escape(game.p2)}</strong></p>
          <p>sont à égalité.</p>
        </div>
      `;
    }
  }

  function escape(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  function onMove(col) {
    if (!game) return;
    const ok = makeMove(game, col);
    if (!ok) return;
    if (game.state === "playing") {
      renderGame();
    } else {
      renderGame();
      // small delay so the user sees the winning token before the victory screen
      setTimeout(() => {
        renderVictory();
        show("victory");
      }, 900);
    }
  }

  function startFromForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p1 = (fd.get("player1") || "Joueur 1").toString().trim() || "Joueur 1";
    const p2 = (fd.get("player2") || "Joueur 2").toString().trim() || "Joueur 2";
    const diff = (fd.get("difficulty") || "easy").toString();
    game = newGame(diff, p1, p2);
    renderGame();
    show("game");
  }

  function bind() {
    $("#start-form").addEventListener("submit", startFromForm);

    $$("[data-action]").forEach((el) => {
      el.addEventListener("click", () => {
        const action = el.dataset.action;
        if (action === "reset") {
          if (!game) return;
          game = newGame(game.difficulty, game.p1, game.p2);
          renderGame();
          show("game");
        } else if (action === "rematch") {
          if (!game) return;
          // swap starting player for variety
          const next = newGame(game.difficulty, game.p1, game.p2);
          next.current = game.winner === P1 ? P2 : P1;
          game = next;
          renderGame();
          show("game");
        } else if (action === "home") {
          show("start");
        }
      });
    });
  }

  bind();
})();
