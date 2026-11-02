// Akari 灯 : placer des lanternes qui éclairent toute la grille
// Cases du joueur (cases blanches) : 0 vide, 1 lanterne, 2 marque « pas de lanterne ».
const AkariEngine = (function () {
  // walls: Int8Array N, -2 = case blanche, -1 = mur sans chiffre, 0..4 = mur chiffré
  function makeBoard(W, H, walls) {
    const N = W * H, sight = [], adj = [];
    for (let i = 0; i < N; i++) {
      const r = (i / W) | 0, c = i % W;
      const a = [];
      if (r > 0) a.push(i - W); if (r < H - 1) a.push(i + W); if (c > 0) a.push(i - 1); if (c < W - 1) a.push(i + 1);
      adj.push(a);
      const s = [];
      if (walls[i] === -2) for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && cc >= 0 && rr < H && cc < W && walls[rr * W + cc] === -2) { s.push(rr * W + cc); rr += dr; cc += dc; }
      }
      sight.push(s);
    }
    return { W, H, N, walls, sight, adj };
  }
  const isWhite = (B, i) => B.walls[i] === -2;
  function initial(B) { const v = new Int8Array(B.N).fill(-1); return v; }  // -1 inconnu, 1 lanterne, 0 non
  const REASON = {
    seen: () => 'Cette case est déjà éclairée par une lanterne qui la voit : on ne peut pas y en mettre une autre.',
    wallFull: n => `Ce mur ${n} a déjà ses ${n} lanterne${n > 1 ? 's' : ''} : les autres cases qui le touchent restent vides.`,
    wallZero: () => 'Ce mur 0 interdit toute lanterne contre lui.',
    wallNeed: n => `Ce mur ${n} a besoin de toutes les cases libres qui le touchent : chacune reçoit une lanterne.`,
    only: () => 'Cette case ne peut être éclairée que depuis un seul endroit : il faut une lanterne ici.'
  };
  function propagate(B, v, note) {
    const set = (i, val, why, focus) => {
      if (v[i] === val) return 0;
      if (v[i] !== -1) return -1;
      v[i] = val;
      return note && note(i, val, why, focus) ? 2 : 1;
    };
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < B.N; i++) if (isWhite(B, i) && v[i] === 1) {
        for (const j of B.sight[i]) {
          if (v[j] === 1) return false;
          const r = set(j, 0, REASON.seen(), i);
          if (r === 2) return 'stop'; if (r) changed = true;
        }
      }
      for (let i = 0; i < B.N; i++) {
        const n = B.walls[i];
        if (n < 0) continue;
        let lamps = 0, unk = [];
        for (const j of B.adj[i]) if (isWhite(B, j)) { if (v[j] === 1) lamps++; else if (v[j] === -1) unk.push(j); }
        if (lamps > n || lamps + unk.length < n) return false;
        if (!unk.length) continue;
        if (lamps === n) {
          for (const j of unk) { const r = set(j, 0, n === 0 ? REASON.wallZero() : REASON.wallFull(n), i); if (r === 2) return 'stop'; if (r) changed = true; }
        } else if (lamps + unk.length === n) {
          for (const j of unk) { const r = set(j, 1, REASON.wallNeed(n), i); if (r === 2) return 'stop'; if (r) changed = true; }
        }
        if (changed) break;
      }
      if (changed) continue;
      for (let i = 0; i < B.N; i++) {
        if (!isWhite(B, i)) continue;
        if (v[i] === 1) continue;
        let lit = false; const cand = [];
        if (v[i] === -1) cand.push(i);
        for (const j of B.sight[i]) { if (v[j] === 1) { lit = true; break; } if (v[j] === -1) cand.push(j); }
        if (lit) continue;
        if (!cand.length) return false;
        if (cand.length === 1) {
          const r = set(cand[0], 1, REASON.only(), i);
          if (r === 2) return 'stop'; if (r < 0) return false;
          changed = true; break;
        }
      }
    }
    return true;
  }
  function solvedValid(B, v) {
    for (let i = 0; i < B.N; i++) if (isWhite(B, i) && v[i] === -1) return false;
    for (let i = 0; i < B.N; i++) if (isWhite(B, i)) {
      if (v[i] === 1) { if (B.sight[i].some(j => v[j] === 1)) return false; continue; }
      if (!B.sight[i].some(j => v[j] === 1)) return false;
    }
    for (let i = 0; i < B.N; i++) if (B.walls[i] >= 0) {
      let l = 0; for (const j of B.adj[i]) if (isWhite(B, j) && v[j] === 1) l++;
      if (l !== B.walls[i]) return false;
    }
    return true;
  }
  function count(B, limit, maxNodes) {
    let n = 0, nodes = 0, sol = null;
    maxNodes = maxNodes || 30000;
    const rec = v => {
      if (n >= limit || nodes > maxNodes) return;
      nodes++;
      if (propagate(B, v) === false) return;
      // pick an unlit cell with fewest candidates, branch on its candidates
      let best = null;
      for (let i = 0; i < B.N; i++) {
        if (!isWhite(B, i) || v[i] === 1) continue;
        let lit = false; const cand = [];
        if (v[i] === -1) cand.push(i);
        for (const j of B.sight[i]) { if (v[j] === 1) { lit = true; break; } if (v[j] === -1) cand.push(j); }
        if (lit) continue;
        if (!best || cand.length < best.length) best = cand;
        if (best.length === 2) break;
      }
      if (!best) {
        for (let i = 0; i < B.N; i++) if (isWhite(B, i) && v[i] === -1) v[i] = 0;
        if (solvedValid(B, v)) { n++; sol = Array.from(v); }
        return;
      }
      // either the first candidate is a lamp, or it isn't
      const k = best[0];
      for (const val of [1, 0]) { const v2 = v.slice(); v2[k] = val; rec(v2); if (n >= limit) return; }
    };
    rec(initial(B));
    return { count: n, sol, aborted: nodes > maxNodes };
  }
  function rate(B) {
    const v = initial(B);
    if (propagate(B, v) === false) return { level: -1 };
    const open = () => { let k = 0; for (let i = 0; i < B.N; i++) if (isWhite(B, i) && v[i] === -1) k++; return k; };
    const u0 = open();
    let look = 0;
    const settle = () => {   // cells that stay unknown once everything is lit and walls satisfied are empty
      let anyUnlit = false;
      for (let i = 0; i < B.N; i++) if (isWhite(B, i) && v[i] !== 1 && !B.sight[i].some(j => v[j] === 1)) anyUnlit = true;
      if (!anyUnlit) for (let i = 0; i < B.N; i++) if (isWhite(B, i) && v[i] === -1) v[i] = 0;
    };
    settle();
    while (open()) {
      let progress = false;
      for (let i = 0; i < B.N && !progress; i++) {
        if (!isWhite(B, i) || v[i] !== -1) continue;
        for (const val of [1, 0]) {
          const v2 = v.slice(); v2[i] = val;
          if (propagate(B, v2) === false) {
            v[i] = 1 - val; look++; progress = true;
            if (propagate(B, v) === false) return { level: -1 };
            settle();
            break;
          }
        }
      }
      if (!progress) return { level: 2, u0, look };
    }
    if (!solvedValid(B, v)) return { level: -1 };
    return { level: u0 ? 1 : 0, u0, look };
  }
  // ---- generator ----
  function genOnce(L) {
    const { W, H } = L, N = W * H;
    const walls = new Int8Array(N).fill(-2);
    const rnd = n => Math.floor(Math.random() * n);
    // symmetric walls (rotation 180°)
    const target = Math.round(N * L.walls);
    let placed = 0, guard = 0;
    while (placed < target && guard++ < N * 10) {
      const i = rnd(N), j = N - 1 - i;
      if (walls[i] !== -2) continue;
      walls[i] = -1; placed++;
      if (j !== i && walls[j] === -2) { walls[j] = -1; placed++; }
    }
    let B = makeBoard(W, H, walls);
    // lamps: random maximal placement
    const sol = new Int8Array(N);
    const relight = () => {
      const order = []; for (let i = 0; i < N; i++) if (walls[i] === -2) order.push(i);
      order.sort(() => Math.random() - 0.5);
      const lit = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (walls[i] === -2 && sol[i]) { lit[i] = 1; B.sight[i].forEach(j => (lit[j] = 1)); }
      for (const i of order) {
        if (lit[i]) continue;
        sol[i] = 1; lit[i] = 1; B.sight[i].forEach(j => (lit[j] = 1));
      }
    };
    const numberAll = () => {
      for (let i = 0; i < N; i++) if (walls[i] !== -2) {
        let l = 0; for (const j of B.adj[i]) if (walls[j] === -2 && sol[j]) l++;
        walls[i] = l;
      }
    };
    relight(); numberAll();
    // while another solution exists, put a wall where the two solutions disagree
    for (let fix = 0; ; fix++) {
      B = makeBoard(W, H, walls);
      const c = count(B, 2);
      if (c.aborted || fix > 40) return null;
      if (c.count === 1) break;
      const other = c.sol, diff = [];
      for (let i = 0; i < N; i++) if (walls[i] === -2 && other[i] === 1 && !sol[i]) diff.push(i);
      if (!diff.length) return null;
      const i = diff[rnd(diff.length)];
      walls[i] = -1; sol[i] = 0;
      B = makeBoard(W, H, walls);
      // lamps that now see each other? (a wall only blocks sight, so no) ; relight cells cut off
      relight(); numberAll();
    }
    // remove numbers while the grid stays unique (and solvable by reasoning)
    const ws = []; for (let i = 0; i < N; i++) if (walls[i] >= 0) ws.push(i);
    ws.sort(() => Math.random() - 0.5);
    const keepRatio = L.keep || 0;
    const maxRemove = Math.floor(ws.length * (1 - keepRatio));
    let removed = 0;
    for (const i of ws) {
      if (removed >= maxRemove) break;
      const old = walls[i]; walls[i] = -1;
      const B2 = makeBoard(W, H, walls);
      const r = rate(B2);
      if (r.level === 0 || (r.level === 1 && !L.simple)) { removed++; continue; }
      walls[i] = old;
    }
    return { W, H, walls: Array.from(walls), sol: Array.from(sol) };
  }
  function generate(L) {
    const t0 = Date.now();
    let best = null, bestScore = -1;
    for (let a = 0; a < 400; a++) {
      if (Date.now() - t0 > 6000 && best) break;
      const g = genOnce(L);
      if (!g) continue;
      const r = rate(makeBoard(g.W, g.H, Int8Array.from(g.walls)));
      if (r.level !== 0 && r.level !== 1) continue;
      if (L.simple && r.level !== 0) continue;
      g.rating = r;
      if (!L.hard) return g;
      if (r.look >= L.hard.look) return g;
      const score = r.look * 3 + r.u0;
      if (score > bestScore) { best = g; bestScore = score; }
    }
    return best;
  }
  return { makeBoard, initial, propagate, solvedValid, count, rate, generate, genOnce, isWhite };
})();
if (typeof module !== 'undefined') module.exports = AkariEngine;

// ---------------------------------------------------------------------------
// Interface Akari
// ---------------------------------------------------------------------------
(function () {
  if (typeof registerGame === 'undefined') return;
  const E = AkariEngine;
  let B = null, paint = null;
  const LV = {
    facile:    { W: 7,  H: 7,  walls: .22, keep: .5, simple: true, label: 'Facile',    kanji: '易' },
    moyen:     { W: 10, H: 10, walls: .21, keep: .2, simple: true, label: 'Moyen',     kanji: '中' },
    difficile: { W: 12, H: 12, walls: .2,  keep: 0,  label: 'Difficile', kanji: '難' },
    expert:    { W: 14, H: 16, walls: .2,  keep: 0,  label: 'Expert',    kanji: '極' },
    maitre:    { W: 16, H: 20, walls: .2,  keep: 0,  label: 'Maître',    kanji: '鬼', hard: { look: 20 } }
  };
  const customLevel = (W, H, hard) => ({ W, H, walls: .21, keep: hard ? 0 : .2, simple: !hard, label: 'Personnalisé', kanji: '自', hard: hard ? { look: Math.round(W * H / 25) } : null });
  const lampAt = (s, i) => s.x[i] === 1;
  function litMap(s) {
    const lit = new Uint8Array(B.N);
    for (let i = 0; i < B.N; i++) if (E.isWhite(B, i) && s.x[i] === 1) { lit[i] = 1; B.sight[i].forEach(j => (lit[j] = 1)); }
    return lit;
  }
  function known(s) {   // player's correct knowledge as solver values
    const v = E.initial(B);
    for (let i = 0; i < B.N; i++) if (E.isWhite(B, i)) {
      if (s.x[i] === 1 && s.sol[i] === 1) v[i] = 1;
      else if (s.x[i] === 2 && s.sol[i] === 0) v[i] = 0;
    }
    return v;
  }
  function findHint(s) {
    for (let i = 0; i < B.N; i++) if (E.isWhite(B, i)) {
      if (s.x[i] === 1 && !s.sol[i]) return { type: 'wrong', i, val: 0, text: 'Cette lanterne n\'a pas sa place ici : retire-la.' };
      if (s.x[i] === 2 && s.sol[i]) return { type: 'wrong', i, val: 1, text: 'Cette case est marquée « vide », mais une lanterne doit s\'y trouver.' };
    }
    let found = null;
    // 1) a lamp that can be deduced (silently applying the "no lamp" deductions on the way)
    let v = known(s);
    E.propagate(B, v, (i, val, why, focus) => {
      if (val !== 1 || s.x[i] === 1) return false;
      found = { i, val, text: why, focus }; return true;
    });
    // 2) otherwise a useful "no lamp" mark (not already obvious from a lamp the player placed)
    if (!found) {
      const lit = litMap(s);
      v = known(s);
      E.propagate(B, v, (i, val, why, focus) => {
        if (val !== 0 || s.x[i] === 2 || lit[i]) return false;
        found = { i, val, text: why + ' Marque-la d\'un point.', focus }; return true;
      });
      if (!found) { v = known(s); E.propagate(B, v); }
    }
    if (!found) {
      for (let i = 0; i < B.N && !found; i++) {
        if (!E.isWhite(B, i) || v[i] !== -1) continue;
        for (const val of [1, 0]) {
          const v2 = v.slice(); v2[i] = val;
          if (E.propagate(B, v2) === false) {
            found = { i, val: 1 - val, focus: i, look: true,
              text: val === 1
                ? 'Raisonnement par l\'absurde : une lanterne ici rendrait la grille impossible (un mur ou une case ne pourrait plus être satisfait). Cette case reste donc vide.'
                : 'Raisonnement par l\'absurde : sans lanterne ici, une case ne pourrait plus être éclairée ou un mur n\'aurait pas assez de lanternes. Il en faut donc une ici.' };
            break;
          }
        }
      }
    }
    if (!found) {
      for (let i = 0; i < B.N; i++) if (E.isWhite(B, i) && s.sol[i] && s.x[i] !== 1) { found = { i, val: 1, focus: i, text: 'Déduction avancée : une lanterne doit se trouver ici.' }; break; }
    }
    return found;
  }
  const ri = i => ({ r: (i / B.W) | 0, c: i % B.W });

  registerGame({
    id: 'akari', name: 'Akari', kanji: '灯', winText: 'Tout est éclairé',
    levels: LV, customLevel, customDefault: { W: 10, H: 10, hard: false }, customRange: { W: [5, 20], H: [5, 25] },
    customInfo: (W, H, hard) => `${W * H} cases · ${hard ? 'raisonnements avancés' : 'déductions directes'}`,
    rules: `<h3 style="margin-top:0">Akari 灯 : les règles</h3><ul>
      <li>Place des <b>lanternes</b> dans les cases blanches. Une lanterne éclaire sa ligne et sa colonne, jusqu'au premier mur.</li>
      <li>Toutes les cases blanches doivent être <b>éclairées</b>.</li>
      <li>Deux lanternes ne doivent <b>jamais se voir</b>.</li>
      <li>Un <b>mur chiffré</b> indique le nombre exact de lanternes qui le touchent (haut, bas, gauche, droite).</li></ul>
      <h3>Commandes</h3><ul>
      <li>Touche une case : <b>lanterne</b>, puis <b>marque</b> (· = pas de lanterne), puis vide.</li>
      <li>Glisse le doigt pour marquer ou effacer plusieurs cases d'un coup.</li></ul>`,
    valid: s => !!s.walls && !!s.sol,
    generate: L => { const g = E.generate(L); return { W: g.W, H: g.H, walls: g.walls, sol: g.sol }; },
    emptyX: s => s.walls.map(() => 0),
    prepare: s => { B = E.makeBoard(s.W, s.H, Int8Array.from(s.walls)); },
    progress: s => { let p = 0; for (let i = 0; i < B.N; i++) if (E.isWhite(B, i) && s.x[i] === 1 && s.sol[i]) p++; return p; },
    check: s => {
      const v = new Int8Array(B.N);
      for (let i = 0; i < B.N; i++) v[i] = s.x[i] === 1 ? 1 : 0;
      return E.solvedValid(B, v) ? true : false;
    },
    wrong: s => { const b = new Set(); for (let i = 0; i < B.N; i++) if (E.isWhite(B, i) && ((s.x[i] === 1 && !s.sol[i]) || (s.x[i] === 2 && s.sol[i]))) b.add(i); return b; },
    wrongText: n => `${plural(n, 'case')} incorrecte${n > 1 ? 's' : ''}, en rouge.`,
    findHint: s => {
      const h = findHint(s);
      if (!h) return null;
      const f = ri(h.focus !== undefined ? h.focus : h.i);
      h.r = f.r; h.c = f.c; h.cell = h.i;
      h.focusText = h.focus !== undefined && h.focus !== h.i && B.walls[h.focus] >= 0 ? `Regarde ce mur ${B.walls[h.focus]}.` : 'Regarde cette case et ce qui l\'entoure.';
      h.apply = st => { st.x[h.i] = h.val === 1 ? 1 : 2; };
      return h;
    },
    render: (s, ctx) => {
      const lit = litMap(s), out = [], W = s.W, H = s.H;
      for (let i = 0; i < B.N; i++) {
        const r = (i / W) | 0, c = i % W, x = c * S, y = r * S;
        if (!E.isWhite(B, i)) continue;
        if (lit[i]) out.push(`<rect class="ak-lit" x="${x}" y="${y}" width="${S}" height="${S}"/>`);
      }
      for (let r = 0; r <= H; r++) out.push(`<line class="gl" x1="0" y1="${r * S}" x2="${W * S}" y2="${r * S}"/>`);
      for (let c = 0; c <= W; c++) out.push(`<line class="gl" x1="${c * S}" y1="0" x2="${c * S}" y2="${H * S}"/>`);
      for (let i = 0; i < B.N; i++) {
        const r = (i / W) | 0, c = i % W, x = c * S, y = r * S, cx = x + S / 2, cy = y + S / 2;
        const bad = ctx.flash && ctx.flash.has(i);
        if (!E.isWhite(B, i)) {
          const n = B.walls[i];
          let cls = 'ak-wall';
          if (n >= 0) {
            let l = 0, free = 0;
            for (const j of B.adj[i]) if (E.isWhite(B, j)) { if (s.x[j] === 1) l++; }
            if (l === n) cls += ' ok'; else if (l > n) cls += ' over';
          }
          out.push(`<g class="${cls}"><rect x="${x + 1}" y="${y + 1}" width="${S - 2}" height="${S - 2}" rx="3"/>${n >= 0 ? `<text x="${cx}" y="${cy + 9}">${n}</text>` : ''}</g>`);
          continue;
        }
        if (s.x[i] === 1) {
          const clash = B.sight[i].some(j => s.x[j] === 1);
          out.push(`<g class="ak-lamp${clash ? ' clash' : ''}${bad ? ' bad' : ''}"><circle cx="${cx}" cy="${cy}" r="15"/><path d="M${cx - 7} ${cy - 18}h14M${cx - 7} ${cy + 18}h14"/></g>`);
        } else if (s.x[i] === 2) out.push(`<circle class="ak-mark${bad ? ' bad' : ''}" cx="${cx}" cy="${cy}" r="4.5"/>`);
        if (bad && s.x[i] !== 1) out.push(`<rect class="ak-bad" x="${x + 4}" y="${y + 4}" width="${S - 8}" height="${S - 8}" rx="4"/>`);
      }
      const h = ctx.hint;
      if (h && h.level >= 2) {
        const f = h.focus !== undefined ? h.focus : h.i, fr = (f / W) | 0, fc = f % W;
        out.push(`<rect class="hcell" x="${fc * S + 3}" y="${fr * S + 3}" width="${S - 6}" height="${S - 6}" rx="5"/>`);
      }
      if (h && h.level >= 3) {
        const r = (h.i / W) | 0, c = h.i % W, cx = c * S + S / 2, cy = r * S + S / 2;
        out.push(h.val === 1 && h.type !== 'wrong' ? `<circle class="ak-ghost" cx="${cx}" cy="${cy}" r="15"/>` : `<rect class="hcell" x="${c * S + 3}" y="${r * S + 3}" width="${S - 6}" height="${S - 6}" rx="5"/>`);
      }
      return out.join('');
    },
    pointerDown: (s, pt) => {
      const cell = cellAt(pt);
      if (!cell) return { pan: true };
      const i = cell.r * s.W + cell.c;
      if (!E.isWhite(B, i)) return { pan: true };
      const from = s.x[i], to = (from + 1) % 3;
      beginStroke();
      s.x[i] = to;
      paint = { from, to: to === 1 ? null : to, done: new Set([i]) };
      strokeChanged();
      return { pan: false, paint: true };
    },
    pointerMove: (s, g, pt) => {
      if (!paint || paint.to === null) return;
      const cell = cellAt(pt);
      if (!cell) return;
      const i = cell.r * s.W + cell.c;
      if (paint.done.has(i) || !E.isWhite(B, i) || s.x[i] !== paint.from) return;
      paint.done.add(i); s.x[i] = paint.to; strokeChanged();
    },
    pointerUp: () => { if (paint) { paint = null; endStroke(true); } },
    pointerCancel: () => { if (paint) { paint = null; endStroke(true); } }
  });
})();
