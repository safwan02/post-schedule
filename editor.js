// Slide editor for the shared schedule page: move, resize, delete or add the Ripster branding layers on any slide,
// then download the result. Edits stay in this browser (localStorage); the slide text and photo are fixed.
(function () {
  var W = 1080, H = 1350, ASSET = {}, LAYERS = null, st = null;
  ['badge', 'wordmark', 'holo'].forEach(function (k) { var i = new Image(); i.src = 'assets/' + k + '.png'; ASSET[k] = i; });
  fetch('layers.json').then(function (r) { return r.json(); }).then(function (j) { LAYERS = j; });

  var css = document.createElement('style');
  css.textContent = '#ed{position:fixed;inset:0;background:rgba(10,10,12,.92);z-index:50;display:none;flex-direction:column;align-items:center;gap:10px;padding:12px;overflow:auto}' +
    '#ed.on{display:flex}#ed canvas{height:min(72vh,900px);max-width:94vw;aspect-ratio:4/5;background:#222;border-radius:6px;touch-action:none;cursor:grab}' +
    '#ed .bar{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:960px}#ed button{font:600 14px -apple-system,sans-serif;padding:8px 12px;border:0;border-radius:8px;background:#f2f2f4;color:#16171b;cursor:pointer}' +
    '#ed button.k{background:#b0a4ff}#ed .t{color:#eee;font:600 15px -apple-system,sans-serif}';
  document.head.appendChild(css);
  var box = document.createElement('div');
  box.id = 'ed';
  box.innerHTML = '<div class="t" id="edT"></div><canvas id="edC" width="1080" height="1350"></canvas>' +
    '<div class="bar"><button id="edP">&lsaquo; Prev</button><button id="edN">Next &rsaquo;</button>' +
    '<button data-add="badge">+ R badge</button><button data-add="wordmark">+ RIPSTER</button><button data-add="holo">+ Holo edge</button>' +
    '<button id="edDel">Delete selected</button><button id="edReset">Reset slide</button>' +
    '<button class="k" id="edDl">Download slide</button><button class="k" id="edAll">Download all</button><button id="edX">Close</button></div>' +
    '<div class="t" style="font-weight:400;opacity:.75">Drag to move. Drag the corner square to resize. Changes are kept in this browser.</div>';
  document.body.appendChild(box);
  var cv = document.getElementById('edC'), cx = cv.getContext('2d');

  function key(k) { return pad(st.post) + '-' + pad(k); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function load(k) {
    try { var s = localStorage.getItem('rip-' + key(k)); if (s) return JSON.parse(s); } catch (e) {}
    return JSON.parse(JSON.stringify((LAYERS || {})[key(k)] || []));
  }
  function save() { try { localStorage.setItem('rip-' + key(st.k), JSON.stringify(st.L)); } catch (e) {} }
  function raw(k, cb) { var i = new Image(); i.onload = function () { cb(i); }; i.src = 'raw/' + key(k) + '.jpg'; }

  function paint(ctx, img, L, sel) {
    ctx.drawImage(img, 0, 0, W, H);
    L.forEach(function (l, n) {
      ctx.drawImage(ASSET[l.a], l.x, l.y, l.w, l.h);
      if (n === sel) {
        ctx.save(); ctx.setLineDash([12, 8]); ctx.lineWidth = 4; ctx.strokeStyle = '#b0a4ff'; ctx.strokeRect(l.x, l.y, l.w, l.h);
        ctx.setLineDash([]); ctx.fillStyle = '#b0a4ff'; ctx.fillRect(l.x + l.w - 22, l.y + l.h - 22, 44, 44); ctx.restore();
      }
    });
  }
  function draw() { if (st && st.img) paint(cx, st.img, st.L, st.sel); }
  function show(k) {
    st.k = k; st.L = load(k); st.sel = -1;
    document.getElementById('edT').textContent = 'Post ' + st.post + ', slide ' + k + ' of ' + st.n;
    raw(k, function (i) { st.img = i; draw(); });
  }
  window.openEditor = function (post, n) { st = { post: post, n: n }; box.classList.add('on'); show(1); };

  function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    var p = pt(e), L = st.L, s = L[st.sel];
    if (s && p.x > s.x + s.w - 40 && p.x < s.x + s.w + 30 && p.y > s.y + s.h - 40 && p.y < s.y + s.h + 30) {
      drag = { mode: 'size', p: p, o: Object.assign({}, s) };
    } else {
      st.sel = -1;
      for (var n = L.length - 1; n >= 0; n--) { var l = L[n]; if (p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y - 10 && p.y <= l.y + l.h + 10) { st.sel = n; break; } }
      drag = st.sel >= 0 ? { mode: 'move', p: p, o: Object.assign({}, L[st.sel]) } : null;
    }
    if (drag) cv.setPointerCapture(e.pointerId);
    draw();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = pt(e), l = st.L[st.sel], dx = p.x - drag.p.x, dy = p.y - drag.p.y;
    if (drag.mode === 'move') { l.x = Math.round(drag.o.x + dx); l.y = Math.round(drag.o.y + dy); }
    else if (l.a === 'holo') { l.w = Math.max(40, Math.round(drag.o.w + dx)); l.h = Math.max(6, Math.round(drag.o.h + dy)); }
    else { var f = Math.max(0.2, (drag.o.w + dx) / drag.o.w); l.w = Math.round(drag.o.w * f); l.h = Math.round(drag.o.h * f); }
    draw();
  });
  cv.addEventListener('pointerup', function () { if (drag) { drag = null; save(); } });

  function add(a) {
    var l = a === 'holo' ? { a: a, x: 0, y: 0, w: W, h: 22 } : a === 'badge' ? { a: a, x: 840, y: 40, w: 120, h: 120 } : { a: a, x: 86, y: 980, w: 300, h: Math.round(300 * 18.22 / 132.87) };
    st.L.push(l); st.sel = st.L.length - 1; save(); draw();
  }
  box.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { add(b.dataset.add); }; });
  document.getElementById('edDel').onclick = function () { if (st.sel >= 0) { st.L.splice(st.sel, 1); st.sel = -1; save(); draw(); } };
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('on')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel >= 0) { st.L.splice(st.sel, 1); st.sel = -1; save(); draw(); e.preventDefault(); }
    if (e.key === 'Escape') box.classList.remove('on');
  });
  document.getElementById('edReset').onclick = function () { try { localStorage.removeItem('rip-' + key(st.k)); } catch (e) {} show(st.k); };
  document.getElementById('edP').onclick = function () { if (st.k > 1) show(st.k - 1); };
  document.getElementById('edN').onclick = function () { if (st.k < st.n) show(st.k + 1); };
  document.getElementById('edX').onclick = function () { box.classList.remove('on'); };

  function render(k, cb) {
    raw(k, function (img) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      paint(c.getContext('2d'), img, load(k), -1);
      c.toBlob(function (b) { cb(new File([b], 'slide-' + k + '.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.95);
    });
  }
  function deliver(files, btn) {
    var mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (mobile && navigator.canShare && navigator.canShare({ files: files })) {
      navigator.share({ files: files }).catch(function (e) { if (!e || e.name !== 'AbortError') save2(files); }); return;
    }
    save2(files);
  }
  function save2(files) {
    files.forEach(function (f, n) {
      setTimeout(function () { var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = 'post' + st.post + '-' + f.name; document.body.appendChild(a); a.click(); a.remove(); }, n * 400);
    });
  }
  document.getElementById('edDl').onclick = function () { save(); render(st.k, function (f) { deliver([f]); }); };
  document.getElementById('edAll').onclick = function () {
    save(); var out = [], left = st.n;
    for (var k = 1; k <= st.n; k++) (function (k) { render(k, function (f) { out[k - 1] = f; if (--left === 0) deliver(out); }); })(k);
  };
})();
