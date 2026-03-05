/* ═══════════════════════════════════════════════════════════
   Kanji Study App  –  app.js
   Requires: data.js (KANJI array)
═══════════════════════════════════════════════════════════ */

/* ── State ──────────────────────────────────────────────── */
const state = {
    // Animate view
    detailIdx: 0,
    strokePaths: [],
    _animTimer: null,
    currentStroke: 0,
    totalStrokes: 0,
    // Write mode
    writeList: [],
    writeIdx: 0,
    writeWriter: null,
    _writing: false,
    _wlx: 0,
    _wly: 0,
};

/* ── Helpers ─────────────────────────────────────────────── */
function toast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════════════════════
   KANJI GRID
══════════════════════════════════════════════════════════ */

function renderGrid() {
    const grid = document.getElementById('kanji-grid');
    grid.innerHTML = KANJI.map((k, i) => `
    <div class="kanji-card ${k.level}" data-idx="${i}" role="button" tabindex="0"
         aria-label="${k.kanji}: ${k.meanings[0]}">
      <span class="kchar">${k.kanji}</span>
      <span class="kmean">${k.meanings[0]}</span>
      <span class="level-badge ${k.level}">${k.level}</span>
    </div>
  `).join('');

    grid.querySelectorAll('.kanji-card').forEach((card, i) => {
        card.addEventListener('click', () => openDetail(i));
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') openDetail(i);
        });
    });
}

/* ══════════════════════════════════════════════════════════
   ANIMATE MODAL
══════════════════════════════════════════════════════════ */

function openDetail(idx) {
    state.detailIdx = idx;
    document.getElementById('detail-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderDetail();
}

function closeDetail() {
    soStopAnim();
    document.getElementById('detail-panel').classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('detail-close').addEventListener('click', closeDetail);
document.getElementById('detail-panel').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-panel')) closeDetail();
});

document.getElementById('detail-prev').addEventListener('click', () => {
    if (state.detailIdx > 0) { state.detailIdx--; renderDetail(); }
});
document.getElementById('detail-next').addEventListener('click', () => {
    if (state.detailIdx < KANJI.length - 1) { state.detailIdx++; renderDetail(); }
});

function renderDetail() {
    const k = KANJI[state.detailIdx];
    if (!k) return;

    document.getElementById('detail-kchar').textContent = k.kanji;
    document.getElementById('detail-meanings').textContent = k.meanings.join(', ');
    document.getElementById('detail-level-badge').innerHTML =
        `<span class="level-badge ${k.level}" style="position:static;display:inline-block;">${k.level}</span>`;

    document.getElementById('detail-onyomi').innerHTML = k.onyomi.length
        ? k.onyomi.map(r => `<span class="chip chip-on">${r}</span>`).join('')
        : '<em style="color:#aaa;font-size:.85rem;">None</em>';

    document.getElementById('detail-kunyomi').innerHTML = k.kunyomi.length
        ? k.kunyomi.map(r => `<span class="chip chip-kun">${r}</span>`).join('')
        : '<em style="color:#aaa;font-size:.85rem;">None</em>';

    document.getElementById('detail-examples').innerHTML = k.examples.length
        ? k.examples.map(ex => `<li>${ex}</li>`).join('')
        : '<li style="color:#aaa">No examples listed.</li>';

    document.getElementById('detail-prev').disabled = state.detailIdx === 0;
    document.getElementById('detail-next').disabled = state.detailIdx >= KANJI.length - 1;

    initStrokeOrder(k.kanji);
}

/* ── Stroke Order (KanjiVG) ─────────────────────────────── */
const STROKE_BTNS = ['anim-play', 'anim-step', 'anim-reset', 'anim-quiz'];

function setStrokeBtnsEnabled(enabled) {
    STROKE_BTNS.forEach(id => { document.getElementById(id).disabled = !enabled; });
}

function soStopAnim() {
    if (state._animTimer) { clearTimeout(state._animTimer); state._animTimer = null; }
}

function initStrokeOrder(kanji) {
    soStopAnim();
    const target = document.getElementById('hanzi-target');
    target.innerHTML = '';
    state.strokePaths = [];
    state.currentStroke = 0;
    state.totalStrokes = 0;
    document.getElementById('stroke-step-row').innerHTML = '';
    document.getElementById('stroke-info').textContent = 'Loading…';
    setStrokeBtnsEnabled(false);

    const cp = kanji.codePointAt(0).toString(16).padStart(5, '0');
    fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${cp}.svg`)
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(svgText => buildStrokeOrderSVG(svgText))
        .catch(() => {
            document.getElementById('stroke-info').textContent =
                'Stroke data unavailable for this kanji. (Needs internet)';
        });
}

function buildStrokeOrderSVG(svgText) {
    const target = document.getElementById('hanzi-target');
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const strokeGroup = doc.querySelector('g[id^="kvg:StrokePaths"]');
    if (!strokeGroup) {
        document.getElementById('stroke-info').textContent = 'Stroke data error.';
        return;
    }

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 109 109');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.display = 'block';

    const outlineG = document.createElementNS(NS, 'g');
    outlineG.setAttribute('fill', 'none');
    outlineG.setAttribute('stroke', '#ddd');
    outlineG.setAttribute('stroke-width', '3.5');
    outlineG.setAttribute('stroke-linecap', 'round');
    outlineG.setAttribute('stroke-linejoin', 'round');

    const revealedG = document.createElementNS(NS, 'g');
    revealedG.setAttribute('fill', 'none');
    revealedG.setAttribute('stroke-linecap', 'round');
    revealedG.setAttribute('stroke-linejoin', 'round');

    const paths = Array.from(strokeGroup.querySelectorAll('path'));
    state.totalStrokes = paths.length;
    state.strokePaths = [];

    paths.forEach(p => {
        const d = p.getAttribute('d');

        const op = document.createElementNS(NS, 'path');
        op.setAttribute('d', d);
        outlineG.appendChild(op);

        const rp = document.createElementNS(NS, 'path');
        rp.setAttribute('d', d);
        rp.setAttribute('stroke', '#2c3e50');
        rp.setAttribute('stroke-width', '3.5');
        rp.style.display = 'none';
        revealedG.appendChild(rp);

        state.strokePaths.push(rp);
    });

    svg.appendChild(outlineG);
    svg.appendChild(revealedG);
    target.appendChild(svg);

    buildStepButtons();
    document.getElementById('stroke-info').textContent =
        `${state.totalStrokes} stroke${state.totalStrokes !== 1 ? 's' : ''}`;
    setStrokeBtnsEnabled(true);
}

function buildStepButtons() {
    const row = document.getElementById('stroke-step-row');
    row.innerHTML = Array.from({ length: state.totalStrokes }, (_, i) =>
        `<button class="stroke-step-btn" data-stroke="${i + 1}">${i + 1}</button>`
    ).join('');

    row.querySelectorAll('.stroke-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            soStopAnim();
            revealStrokesUpTo(parseInt(btn.dataset.stroke));
        });
    });
}

function revealStrokesUpTo(n) {
    state.strokePaths.forEach((p, i) => {
        p.style.transition = '';
        p.style.strokeDasharray = '';
        p.style.strokeDashoffset = '';
        p.style.display = i < n ? '' : 'none';
    });
    state.currentStroke = n;
    updateStepBtns(n);
    document.getElementById('stroke-info').textContent = n === 0
        ? `${state.totalStrokes} stroke${state.totalStrokes !== 1 ? 's' : ''}`
        : `Stroke ${n} / ${state.totalStrokes}`;
}

function highlightStrokeStep(n) { updateStepBtns(n); }

function updateStepBtns(n) {
    document.querySelectorAll('.stroke-step-btn').forEach(b => {
        const s = parseInt(b.dataset.stroke);
        b.classList.remove('done', 'current');
        if (s < n) b.classList.add('done');
        if (s === n) b.classList.add('current');
    });
}

function soAnimateFrom(i) {
    if (i >= state.totalStrokes) {
        document.getElementById('stroke-info').textContent = '✓ Done!';
        return;
    }
    const path = state.strokePaths[i];
    const len = path.getTotalLength ? path.getTotalLength() : 100;
    path.style.transition = 'none';
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    path.style.display = '';
    path.getBoundingClientRect(); // force reflow
    const dur = Math.max(250, Math.min(len * 8, 800));
    path.style.transition = `stroke-dashoffset ${dur}ms ease`;
    path.style.strokeDashoffset = '0';
    state.currentStroke = i + 1;
    updateStepBtns(i + 1);
    document.getElementById('stroke-info').textContent = `Stroke ${i + 1} / ${state.totalStrokes}`;
    state._animTimer = setTimeout(() => soAnimateFrom(i + 1), dur + 300);
}

/* Stroke control buttons */
document.getElementById('anim-play').addEventListener('click', () => {
    if (!state.strokePaths.length) return;
    soStopAnim();
    revealStrokesUpTo(0);
    soAnimateFrom(0);
});

document.getElementById('anim-reset').addEventListener('click', () => {
    soStopAnim();
    revealStrokesUpTo(0);
});

document.getElementById('anim-step').addEventListener('click', () => {
    if (!state.strokePaths.length) return;
    soStopAnim();
    const next = state.currentStroke >= state.totalStrokes ? 1 : state.currentStroke + 1;
    revealStrokesUpTo(next);
});

document.getElementById('anim-quiz').addEventListener('click', () => {
    openWriteMode();
});
/* ── Keyboard: close modal on Escape, navigate with arrows ─ */
document.addEventListener('keydown', e => {
    if (document.getElementById('write-panel').classList.contains('open')) {
        if (e.key === 'Escape') closeWriteMode();
        return;
    }
    const panel = document.getElementById('detail-panel');
    if (!panel.classList.contains('open')) return;
    if (e.key === 'Escape') closeDetail();
    if (e.key === 'ArrowLeft') document.getElementById('detail-prev').click();
    if (e.key === 'ArrowRight') document.getElementById('detail-next').click();
});

/* ══════════════════════════════════════════════════════════
   WRITE MODE
══════════════════════════════════════════════════════════ */

/* ── Canvas drawing – bind events once ──────────────────── */
(function () {
    const canvas = document.getElementById('write-canvas');
    const ctx = canvas.getContext('2d');

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function applyStyle() {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = Math.max(3, canvas.offsetWidth * 0.013);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    canvas.addEventListener('pointerdown', e => {
        state._writing = true;
        canvas.setPointerCapture(e.pointerId);
        const p = pos(e);
        state._wlx = p.x; state._wly = p.y;
        applyStyle();
        ctx.beginPath();
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
    });

    canvas.addEventListener('pointermove', e => {
        if (!state._writing) return;
        const p = pos(e);
        applyStyle();
        ctx.beginPath();
        ctx.moveTo(state._wlx, state._wly);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        state._wlx = p.x; state._wly = p.y;
    });

    ['pointerup', 'pointercancel'].forEach(ev =>
        canvas.addEventListener(ev, () => { state._writing = false; })
    );
})();

function clearWriteCanvas() {
    const c = document.getElementById('write-canvas');
    c.getContext('2d').clearRect(0, 0, c.offsetWidth, c.offsetHeight);
}

function computeWriteSize() {
    const panel = document.getElementById('write-panel');
    const header = document.querySelector('.write-header');
    const controls = document.querySelector('.write-controls');
    const gap = 14; // matches CSS gap
    const padTop = 60; // space reserved for close button
    const padBot = 20;
    const padSides = 32; // 16px each side
    const maxW = panel.offsetWidth - padSides;
    const maxH = panel.offsetHeight - padTop - padBot
        - header.offsetHeight - controls.offsetHeight
        - gap * 2;
    const size = Math.max(80, Math.min(maxW, maxH));
    const wrap = document.getElementById('write-canvas-wrap');
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    document.querySelector('.write-controls').style.width = size + 'px';
}

function resizeWriteCanvas() {
    const c = document.getElementById('write-canvas');
    const wrap = document.getElementById('write-canvas-wrap');
    const dpr = window.devicePixelRatio || 1;
    c.width = wrap.offsetWidth * dpr;
    c.height = wrap.offsetHeight * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
}

function openWriteMode() {
    state.writeList = KANJI;
    state.writeIdx = state.detailIdx;
    document.getElementById('write-panel').classList.add('open');
    requestAnimationFrame(() => {
        computeWriteSize();
        resizeWriteCanvas();
        renderWriteMode();
    });
}

function closeWriteMode() {
    document.getElementById('write-panel').classList.remove('open');
    state.writeWriter = null;
}

function renderWriteMode() {
    const k = state.writeList[state.writeIdx];
    if (!k) return;
    document.getElementById('write-kchar').textContent = k.kanji;
    document.getElementById('write-meaning').textContent = k.meanings[0];
    document.getElementById('write-prev').disabled = state.writeIdx === 0;
    document.getElementById('write-next').disabled = state.writeIdx >= state.writeList.length - 1;
    clearWriteCanvas();
    initWriteGuide(k.kanji);
}

function initWriteGuide(kanji) {
    const target = document.getElementById('write-hanzi-target');
    target.innerHTML = '';
    document.getElementById('write-stroke-numbers').innerHTML = '';
    state.writeWriter = null;

    const wrap = document.getElementById('write-canvas-wrap');
    const size = wrap.offsetWidth;

    // KanjiVG filenames are 5-digit lowercase hex (e.g. 日 → 065e5)
    const cp = kanji.codePointAt(0).toString(16).padStart(5, '0');
    const svgUrl = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${cp}.svg`;

    fetch(svgUrl)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
        .then(svgText => renderKanjiVGGuide(svgText, size))
        .catch(() => {
            target.innerHTML =
                `<div style="display:flex;align-items:center;justify-content:center;` +
                `height:100%;color:#aaa;font-size:.85rem;padding:16px;text-align:center;">` +
                `Kanji guide unavailable<br>(needs internet)</div>`;
        });
}

function renderKanjiVGGuide(svgText, size) {
    const target = document.getElementById('write-hanzi-target');
    const numSvg = document.getElementById('write-stroke-numbers');

    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');

    // ── Stroke path guide ──────────────────────────────────────
    // KanjiVG viewBox is always 0 0 109 109
    const strokeGroup = doc.querySelector('g[id^="kvg:StrokePaths"]');
    const guideSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    guideSvg.setAttribute('viewBox', '0 0 109 109');
    guideSvg.setAttribute('width', size);
    guideSvg.setAttribute('height', size);
    guideSvg.style.display = 'block';

    if (strokeGroup) {
        const g = strokeGroup.cloneNode(true);
        g.setAttribute('style', 'fill:none;stroke:#2c3e50;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;');
        guideSvg.appendChild(g);
    }
    target.appendChild(guideSvg);

    // ── Stroke order numbers (kakijun) ─────────────────────────
    // KanjiVG encodes number positions as matrix(1 0 0 1 tx ty) in the
    // kvg:StrokeNumbers group – the same 109×109 coordinate space
    const numGroup = doc.querySelector('g[id^="kvg:StrokeNumbers"]');
    if (!numGroup) return;

    const scale = size / 109;
    const r = Math.max(11, size * 0.033);
    const fs = Math.round(r * 0.82);

    numSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    numSvg.innerHTML = Array.from(numGroup.querySelectorAll('text')).map(t => {
        const m = (t.getAttribute('transform') || '')
            .match(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)/);
        if (!m) return '';
        const cx = (parseFloat(m[1]) * scale).toFixed(1);
        const cy = (parseFloat(m[2]) * scale).toFixed(1);
        const n = t.textContent.trim();
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e84040" fill-opacity="0.9"/>` +
            `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
            `font-size="${fs}" font-weight="700" fill="white" ` +
            `font-family="'Segoe UI',Arial,sans-serif">${n}</text>`;
    }).join('');
}

document.getElementById('write-close').addEventListener('click', closeWriteMode);
document.getElementById('write-clear').addEventListener('click', clearWriteCanvas);
document.getElementById('write-prev').addEventListener('click', () => {
    if (state.writeIdx > 0) { state.writeIdx--; renderWriteMode(); }
});
document.getElementById('write-next').addEventListener('click', () => {
    if (state.writeIdx < state.writeList.length - 1) { state.writeIdx++; renderWriteMode(); }
});
document.getElementById('detail-write-btn').addEventListener('click', openWriteMode);

window.addEventListener('resize', () => {
    if (!document.getElementById('write-panel').classList.contains('open')) return;
    computeWriteSize();
    resizeWriteCanvas();
});

/* ── Init ───────────────────────────────────────────────── */
renderGrid();
