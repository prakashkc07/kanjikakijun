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

function renderGrid(filter = '') {
    const q = filter.trim().toLowerCase();
    const matches = q
        ? KANJI.filter(k =>
            k.kanji.includes(q) ||
            k.meanings.some(m => m.toLowerCase().includes(q)) ||
            k.onyomi.some(r => r.toLowerCase().includes(q)) ||
            k.kunyomi.some(r => r.toLowerCase().includes(q))
        )
        : KANJI;

    const countEl = document.getElementById('search-count');
    countEl.textContent = q ? `${matches.length} / ${KANJI.length}` : `${KANJI.length}`;

    const grid = document.getElementById('kanji-grid');
    grid.innerHTML = matches.map((k) => {
        const i = KANJI.indexOf(k);
        return `
    <div class="kanji-card ${k.level}" data-idx="${i}" role="button" tabindex="0"
         aria-label="${k.kanji}: ${k.meanings[0]}">
      <span class="kchar">${k.kanji}</span>
      <span class="level-badge ${k.level}">${k.level}</span>
    </div>`;
    }).join('');

    grid.querySelectorAll('.kanji-card').forEach(card => {
        const i = parseInt(card.dataset.idx);
        card.addEventListener('click', () => openDetail(i));
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') openDetail(i);
        });
    });
}

document.getElementById('search-input').addEventListener('input', e => {
    renderGrid(e.target.value);
});

/* ══════════════════════════════════════════════════════════
   ANIMATE MODAL
══════════════════════════════════════════════════════════ */

function openDetail(idx) {
    state.detailIdx = idx;
    document.getElementById('detail-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderDetail();
    requestAnimationFrame(() => requestAnimationFrame(resizeWriteCanvas));
}

function closeDetail() {
    soStopAnim();
    clearWriteCanvas();
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

    document.getElementById('detail-level-badge').innerHTML =
        `<span class="level-badge ${k.level}" style="position:static;display:inline-block;">${k.level}</span>`;

    document.getElementById('detail-onyomi').innerHTML = k.onyomi.length
        ? k.onyomi.map(r => `<span class="chip chip-on">${r}</span>`).join('')
        : '';

    document.getElementById('detail-kunyomi').innerHTML = k.kunyomi.length
        ? k.kunyomi.map(r => `<span class="chip chip-kun">${r}</span>`).join('')
        : '';

    document.getElementById('detail-examples').innerHTML =
        k.examples.map(ex => `<li>${ex}</li>`).join('');

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
    state.strokeNums = [];
    state.currentStroke = 0;
    state.totalStrokes = 0;
    document.getElementById('stroke-step-row').innerHTML = '';
    document.getElementById('stroke-info').textContent = '…';
    setStrokeBtnsEnabled(false);

    const cp = kanji.codePointAt(0).toString(16).padStart(5, '0');
    fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${cp}.svg`)
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(svgText => buildStrokeOrderSVG(svgText))
        .catch(() => {
            document.getElementById('stroke-info').textContent = '×';
        });
}

function buildStrokeOrderSVG(svgText) {
    const target = document.getElementById('hanzi-target');
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const strokeGroup = doc.querySelector('g[id^="kvg:StrokePaths"]');
    if (!strokeGroup) {
        document.getElementById('stroke-info').textContent = '×';
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

    // ── Stroke order numbers overlay (hidden until stroke drawn) ───
    const numGroup = doc.querySelector('g[id^="kvg:StrokeNumbers"]');
    const numSvg = document.getElementById('detail-stroke-numbers');
    numSvg.innerHTML = '';
    state.strokeNums = [];
    if (numGroup) {
        numSvg.setAttribute('viewBox', '0 0 109 109');
        Array.from(numGroup.querySelectorAll('text')).forEach(t => {
            const m = (t.getAttribute('transform') || '')
                .match(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)/);
            if (!m) { state.strokeNums.push(null); return; }
            const cx = parseFloat(m[1]).toFixed(1);
            const cy = parseFloat(m[2]).toFixed(1);
            const n = t.textContent.trim();
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            el.setAttribute('x', cx);
            el.setAttribute('y', cy);
            el.setAttribute('text-anchor', 'middle');
            el.setAttribute('dominant-baseline', 'central');
            el.setAttribute('font-size', '7');
            el.setAttribute('font-weight', '800');
            el.setAttribute('fill', '#c0392b');
            el.setAttribute('paint-order', 'stroke');
            el.setAttribute('stroke', 'white');
            el.setAttribute('stroke-width', '2');
            el.setAttribute('stroke-linejoin', 'round');
            el.setAttribute('font-family', "'Segoe UI',Arial,sans-serif");
            el.style.display = 'none';
            el.textContent = n;
            numSvg.appendChild(el);
            state.strokeNums.push(el);
        });
    }

    buildStepButtons();
    document.getElementById('stroke-info').textContent = `${state.totalStrokes}画`;
    setStrokeBtnsEnabled(true);
}

function buildStepButtons() {
    const row = document.getElementById('stroke-step-row');
    row.innerHTML = Array.from({ length: state.totalStrokes }, (_, i) =>
        `<button class="stroke-step-btn" data-stroke="${i + 1}">${i + 1}</button>`
    ).join('');

    row.querySelectorAll('.stroke-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearWriteCanvas();
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
    state.strokeNums.forEach((el, i) => { if (el) el.style.display = i < n ? '' : 'none'; });
    state.currentStroke = n;
    updateStepBtns(n);
    document.getElementById('stroke-info').textContent = n === 0
        ? `${state.totalStrokes}画`
        : `${n} / ${state.totalStrokes}`;
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
        document.getElementById('stroke-info').textContent = '✓';
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
    if (state.strokeNums[i]) state.strokeNums[i].style.display = '';
    updateStepBtns(i + 1);
    document.getElementById('stroke-info').textContent = `Stroke ${i + 1} / ${state.totalStrokes}`;
    state._animTimer = setTimeout(() => soAnimateFrom(i + 1), dur + 300);
}

/* Stroke control buttons */
document.getElementById('anim-play').addEventListener('click', () => {
    if (!state.strokePaths.length) return;
    clearWriteCanvas();
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
    clearWriteCanvas();
});
/* ── Keyboard: close modal on Escape, navigate with arrows ─ */
document.addEventListener('keydown', e => {
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
        return { x: e.offsetX, y: e.offsetY };
    }

    function applyStyle() {
        ctx.strokeStyle = 'rgba(255, 180, 0, 0.90)';
        ctx.lineWidth = Math.max(14, canvas.offsetWidth * 0.06);
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
        ctx.fillStyle = 'rgba(255, 180, 0, 0.90)';
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

function resizeWriteCanvas() {
    const c = document.getElementById('write-canvas');
    const container = document.getElementById('stroke-order-container');
    const dpr = window.devicePixelRatio || 1;
    c.width = container.offsetWidth * dpr;
    c.height = container.offsetHeight * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', () => {
    if (!document.getElementById('detail-panel').classList.contains('open')) return;
    resizeWriteCanvas();
});

/* ── Init ───────────────────────────────────────────────── */
renderGrid();
