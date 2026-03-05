/* ═══════════════════════════════════════════════════════════
   Kanji Study App  –  app.js
   Requires: hanzi-writer (CDN), data.js (KANJI array)
═══════════════════════════════════════════════════════════ */

/* ── State ──────────────────────────────────────────────── */
const state = {
  filter:    'All',       // 'All' | 'N5' | 'N4' | 'Learned'
  search:    '',
  learned:   new Set(JSON.parse(localStorage.getItem('kk-learned') || '[]')),
  // Detail
  detailIdx: 0,
  filteredForDetail: [],
  writer:    null,
  currentStroke: 0,
  totalStrokes:  0,
  // Quiz
  quizQuestions: [],
  quizCurrent:   0,
  quizCorrect:   0,
  quizWrong:     0,
  quizAnswered:  false,
};

/* ── Helpers ─────────────────────────────────────────────── */
function saveLearnedState() {
  localStorage.setItem('kk-learned', JSON.stringify([...state.learned]));
}

function toast(msg, duration = 2000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(arr, n) {
  return shuffle([...arr]).slice(0, n);
}

/* ── Tab Routing ─────────────────────────────────────────── */
document.querySelectorAll('#main-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#main-nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'progress') renderProgress();
  });
});

/* ══════════════════════════════════════════════════════════
   BROWSE TAB
══════════════════════════════════════════════════════════ */

/* Filter buttons */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.level;
    renderGrid();
  });
});

/* Search */
document.getElementById('search-input').addEventListener('input', e => {
  state.search = e.target.value.trim().toLowerCase();
  renderGrid();
});

function filteredKanji() {
  return KANJI.filter(k => {
    if (state.filter === 'N5' && k.level !== 'N5') return false;
    if (state.filter === 'N4' && k.level !== 'N4') return false;
    if (state.filter === 'Learned' && !state.learned.has(k.kanji)) return false;
    if (state.search) {
      const q = state.search;
      return k.kanji.includes(q)
        || k.meanings.some(m => m.toLowerCase().includes(q))
        || k.onyomi.some(r => r.toLowerCase().includes(q))
        || k.kunyomi.some(r => r.toLowerCase().includes(q));
    }
    return true;
  });
}

function renderGrid() {
  const grid = document.getElementById('kanji-grid');
  const list = filteredKanji();

  if (list.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);margin:20px 0;">No kanji found.</p>';
    return;
  }

  grid.innerHTML = list.map((k, i) => `
    <div class="kanji-card${state.learned.has(k.kanji) ? ' learned' : ''}"
         data-idx="${i}" data-kanji="${k.kanji}" role="button" tabindex="0"
         aria-label="${k.kanji}: ${k.meanings[0]}">
      <span class="learned-mark">✓</span>
      <span class="kchar">${k.kanji}</span>
      <span class="kmean">${k.meanings[0]}</span>
      <span class="level-badge ${k.level}">${k.level}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.kanji-card').forEach((card, i) => {
    card.addEventListener('click', () => openDetail(list, i));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openDetail(list, i); });
  });

  updateHeaderStats();
}

function updateHeaderStats() {
  const total   = KANJI.length;
  const learned = state.learned.size;
  document.getElementById('header-stats').innerHTML =
    `${learned}/${total} learned &nbsp;|&nbsp; N5: ${KANJI.filter(k=>k.level==='N5').length} &nbsp; N4: ${KANJI.filter(k=>k.level==='N4').length}`;
}

/* ══════════════════════════════════════════════════════════
   DETAIL MODAL  (kjanidiv stroke order panel)
══════════════════════════════════════════════════════════ */

function openDetail(list, idx) {
  state.filteredForDetail = list;
  state.detailIdx = idx;
  renderDetail();
  document.getElementById('detail-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
  document.body.style.overflow = '';
  if (state.writer) {
    state.writer = null;
  }
}

document.getElementById('detail-close').addEventListener('click', closeDetail);
document.getElementById('detail-panel').addEventListener('click', e => {
  if (e.target === document.getElementById('detail-panel')) closeDetail();
});

document.getElementById('detail-prev').addEventListener('click', () => {
  if (state.detailIdx > 0) { state.detailIdx--; renderDetail(); }
});
document.getElementById('detail-next').addEventListener('click', () => {
  if (state.detailIdx < state.filteredForDetail.length - 1) { state.detailIdx++; renderDetail(); }
});

function renderDetail() {
  const k = state.filteredForDetail[state.detailIdx];
  if (!k) return;

  document.getElementById('detail-kchar').textContent = k.kanji;
  document.getElementById('detail-meanings').textContent = k.meanings.join(', ');
  document.getElementById('detail-level-badge').innerHTML =
    `<span class="level-badge ${k.level}" style="position:static;display:inline-block;">${k.level}</span>`;

  document.getElementById('detail-onyomi').innerHTML = k.onyomi.length
    ? k.onyomi.map(r => `<span class="chip chip-on">${r}</span>`).join('')
    : '<em style="color:var(--text-muted);font-size:.85rem;">None</em>';

  document.getElementById('detail-kunyomi').innerHTML = k.kunyomi.length
    ? k.kunyomi.map(r => `<span class="chip chip-kun">${r}</span>`).join('')
    : '<em style="color:var(--text-muted);font-size:.85rem;">None</em>';

  document.getElementById('detail-examples').innerHTML = k.examples.length
    ? k.examples.map(ex => `<li>${ex}</li>`).join('')
    : '<li style="color:var(--text-muted)">No examples listed.</li>';

  const learnBtn = document.getElementById('detail-mark-learned');
  if (state.learned.has(k.kanji)) {
    learnBtn.textContent = '✓ Learned ✓';
    learnBtn.classList.replace('btn-primary', 'btn-secondary');
  } else {
    learnBtn.textContent = '✓ Mark as Learned';
    learnBtn.classList.replace('btn-secondary', 'btn-primary');
  }

  document.getElementById('detail-prev').disabled = state.detailIdx === 0;
  document.getElementById('detail-next').disabled = state.detailIdx >= state.filteredForDetail.length - 1;

  initStrokeOrder(k.kanji);
}

/* Mark learned */
document.getElementById('detail-mark-learned').addEventListener('click', () => {
  const k = state.filteredForDetail[state.detailIdx];
  if (state.learned.has(k.kanji)) {
    state.learned.delete(k.kanji);
    toast(`Removed ${k.kanji} from learned.`);
  } else {
    state.learned.add(k.kanji);
    toast(`Marked ${k.kanji} as learned! 🎉`);
  }
  saveLearnedState();
  renderDetail();
  renderGrid();          // refresh the card state
});

/* ── Stroke Order (kjanidiv) ─────────────────────────────── */
function initStrokeOrder(kanji) {
  const target = document.getElementById('hanzi-target');
  target.innerHTML = '';
  state.writer = null;
  state.currentStroke = 0;
  state.totalStrokes = 0;
  document.getElementById('stroke-step-row').innerHTML = '';
  document.getElementById('stroke-info').textContent = 'Loading stroke data…';

  // Get unicode code point (lowercase hex)
  const cp = kanji.codePointAt(0).toString(16).toLowerCase();
  const dataUrl = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${cp}.json`;

  // Create the writer – hanzi-writer fetches stroke data automatically via the CDN loader
  try {
    state.writer = HanziWriter.create('hanzi-target', kanji, {
      width:  180,
      height: 180,
      padding: 10,
      strokeColor:       '#2c3e50',
      radicalColor:      '#c0392b',
      highlightColor:    '#e67e22',
      outlineColor:      '#ddd',
      drawingColor:      '#27ae60',
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes:  350,
      showCharacter:  false,
      showOutline:    true,
      renderer: 'svg',
      charDataLoader(char, onLoad, onError) {
        fetch(dataUrl)
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then(data => onLoad(data))
          .catch(err => {
            document.getElementById('stroke-info').textContent =
              'Stroke data unavailable for this kanji. (Needs internet)';
            onError(err);
          });
      },
    });

    // After writer is ready, get stroke count
    // We poll for it since hanzi-writer doesn't emit a ready event in all versions
    let attempts = 0;
    const pollStrokes = setInterval(() => {
      attempts++;
      const data = getWriterCharData(state.writer);
      if (data && data.strokes) {
        clearInterval(pollStrokes);
        state.totalStrokes = data.strokes.length;
        document.getElementById('stroke-info').textContent =
          `${state.totalStrokes} stroke${state.totalStrokes !== 1 ? 's' : ''}`;
        buildStepButtons();
      } else if (attempts > 40) {
        clearInterval(pollStrokes);
        // Try to get from property
        document.getElementById('stroke-info').textContent = 'Ready (stroke count loading…)';
      }
    }, 200);

  } catch (e) {
    document.getElementById('stroke-info').textContent = 'Stroke animation requires an internet connection.';
  }
}

/* Access private charData from writer object – works in hanzi-writer v3 */
function getWriterCharData(writer) {
  try {
    return writer._character || writer._hanziCharacter || null;
  } catch (_) { return null; }
}

function buildStepButtons() {
  const row = document.getElementById('stroke-step-row');
  row.innerHTML = Array.from({ length: state.totalStrokes }, (_, i) =>
    `<button class="stroke-step-btn" data-stroke="${i + 1}">${i + 1}</button>`
  ).join('');

  row.querySelectorAll('.stroke-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.stroke);
      highlightStrokeStep(n);
    });
  });
}

function highlightStrokeStep(n) {
  state.currentStroke = n;
  document.querySelectorAll('.stroke-step-btn').forEach(b => {
    const s = parseInt(b.dataset.stroke);
    b.classList.remove('done', 'current');
    if (s < n)  b.classList.add('done');
    if (s === n) b.classList.add('current');
  });
}

/* Stroke control buttons */
document.getElementById('anim-play').addEventListener('click', () => {
  if (!state.writer) return;
  state.writer.animateCharacter({
    onComplete: () => {
      state.currentStroke = state.totalStrokes;
      highlightStrokeStep(state.totalStrokes);
    }
  });
});

document.getElementById('anim-reset').addEventListener('click', () => {
  if (!state.writer) return;
  state.writer.hideCharacter();
  state.writer.showOutline();
  state.currentStroke = 0;
  document.querySelectorAll('.stroke-step-btn').forEach(b => b.classList.remove('done', 'current'));
});

document.getElementById('anim-step').addEventListener('click', () => {
  if (!state.writer || state.totalStrokes === 0) return;
  const next = (state.currentStroke % state.totalStrokes) + 1;
  state.writer.animateStroke(next - 1, {    // 0-indexed
    onComplete: () => highlightStrokeStep(next)
  });
  state.currentStroke = next;
});

document.getElementById('anim-quiz').addEventListener('click', () => {
  if (!state.writer) return;
  state.writer.quiz({
    onMistake(strokeData) {
      document.getElementById('stroke-info').textContent =
        `Stroke ${strokeData.strokeNum + 1}: ✗ Mistake (try again)`;
    },
    onCorrectStroke(strokeData) {
      document.getElementById('stroke-info').textContent =
        `Stroke ${strokeData.strokeNum + 1} ✓  –  ${strokeData.strokeNum + 1} / ${state.totalStrokes}`;
    },
    onComplete() {
      document.getElementById('stroke-info').textContent = '🎉 Perfect! You drew it correctly!';
    }
  });
  document.getElementById('stroke-info').textContent = 'Draw the kanji stroke by stroke…';
});

/* ══════════════════════════════════════════════════════════
   QUIZ TAB
══════════════════════════════════════════════════════════ */

document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
document.getElementById('next-question-btn').addEventListener('click', nextQuestion);
document.getElementById('quiz-again-btn').addEventListener('click', startQuiz);
document.getElementById('quiz-change-btn').addEventListener('click', () => {
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-setup').style.display = 'block';
  document.getElementById('quiz-active').style.display = 'none';
});

function getRadioVal(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value;
}

function startQuiz() {
  const qtype  = getRadioVal('qtype')  || 'kanji-to-meaning';
  const qlevel = getRadioVal('qlevel') || 'All';
  const qcount = parseInt(getRadioVal('qcount') || '10');

  let pool = KANJI.filter(k => qlevel === 'All' || k.level === qlevel);
  if (pool.length < 4) {
    toast('Not enough kanji for this level – using all levels.');
    pool = KANJI;
  }

  // Build questions
  const questions = shuffle([...pool]).slice(0, Math.min(qcount, pool.length)).map(correct => {
    // Pick 3 wrong distractors
    const others = shuffle(pool.filter(k => k.kanji !== correct.kanji)).slice(0, 3);
    const all4   = shuffle([correct, ...others]);

    let prompt, promptLabel, hint, getOptionText, getAnswerText;

    if (qtype === 'kanji-to-meaning') {
      prompt        = `<div class="quiz-big-kanji">${correct.kanji}</div>`;
      promptLabel   = 'What does this kanji mean?';
      hint          = `${correct.level}`;
      getOptionText = k => k.meanings[0];
      getAnswerText = k => k.meanings[0];
    } else if (qtype === 'meaning-to-kanji') {
      prompt        = `<div class="quiz-big-text">${correct.meanings[0]}</div>`;
      promptLabel   = 'Which kanji has this meaning?';
      hint          = `${correct.level}`;
      getOptionText = k => `<span style="font-size:2rem;font-family:'Noto Serif JP',serif">${k.kanji}</span><br/><small style="font-size:.7rem;color:#888">${k.meanings[0]}</small>`;
      getAnswerText = k => k.kanji;
    } else {
      // kanji-to-reading
      prompt        = `<div class="quiz-big-kanji">${correct.kanji}</div>`;
      promptLabel   = 'What is the on\'yomi (音読み)?';
      hint          = `meaning: ${correct.meanings[0]}`;
      getOptionText = k => k.onyomi[0] || k.kunyomi[0] || '?';
      getAnswerText = k => k.onyomi[0] || k.kunyomi[0] || '?';
    }

    return {
      correct,
      options: all4,
      prompt, promptLabel, hint,
      getOptionText, getAnswerText,
      correctAnswer: getAnswerText(correct),
    };
  });

  state.quizQuestions = questions;
  state.quizCurrent   = 0;
  state.quizCorrect   = 0;
  state.quizWrong     = 0;
  state.quizAnswered  = false;

  document.getElementById('quiz-result').style.display  = 'none';
  document.getElementById('quiz-setup').style.display   = 'none';
  document.getElementById('quiz-active').style.display  = 'block';
  document.getElementById('q-total').textContent = questions.length;

  renderQuestion();
}

function renderQuestion() {
  const q = state.quizQuestions[state.quizCurrent];
  const total = state.quizQuestions.length;

  document.getElementById('q-current').textContent  = state.quizCurrent + 1;
  document.getElementById('score-correct').textContent = state.quizCorrect;
  document.getElementById('score-wrong').textContent   = state.quizWrong;
  document.getElementById('quiz-progress-bar').style.width =
    Math.round((state.quizCurrent / total) * 100) + '%';

  document.getElementById('q-prompt-label').textContent = q.promptLabel;
  document.getElementById('q-prompt').innerHTML = q.prompt;
  document.getElementById('q-hint').textContent = q.hint;

  const fb = document.getElementById('quiz-feedback');
  fb.className = 'quiz-feedback';
  fb.textContent = '';

  document.getElementById('quiz-next-row').style.display = 'none';
  state.quizAnswered = false;

  const optContainer = document.getElementById('quiz-options');
  optContainer.innerHTML = q.options.map((k, i) =>
    `<button class="quiz-option" data-idx="${i}">${q.getOptionText(k)}</button>`
  ).join('');

  optContainer.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx)));
  });
}

function handleAnswer(optIdx) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  const q = state.quizQuestions[state.quizCurrent];
  const chosen  = q.options[optIdx];
  const correct = q.correct;
  const isRight = chosen.kanji === correct.kanji;

  const fb = document.getElementById('quiz-feedback');
  const buttons = document.querySelectorAll('.quiz-option');

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (q.options[i].kanji === correct.kanji) btn.classList.add('correct');
    else if (i === optIdx && !isRight) btn.classList.add('wrong');
  });

  if (isRight) {
    state.quizCorrect++;
    state.learned.add(correct.kanji);
    saveLearnedState();
    fb.textContent = `✓ Correct! ${correct.kanji} = ${correct.meanings[0]}`;
    fb.className = 'quiz-feedback show correct-fb';
  } else {
    state.quizWrong++;
    fb.textContent = `✗ The answer was: ${correct.kanji} = ${correct.meanings[0]}`;
    fb.className = 'quiz-feedback show wrong-fb';
  }

  document.getElementById('score-correct').textContent = state.quizCorrect;
  document.getElementById('score-wrong').textContent   = state.quizWrong;
  document.getElementById('quiz-next-row').style.display = 'block';
}

function nextQuestion() {
  state.quizCurrent++;
  if (state.quizCurrent >= state.quizQuestions.length) {
    showQuizResult();
  } else {
    renderQuestion();
  }
}

function showQuizResult() {
  document.getElementById('quiz-active').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'block';

  const total = state.quizQuestions.length;
  const pct   = Math.round((state.quizCorrect / total) * 100);
  document.getElementById('result-score').textContent = `${state.quizCorrect} / ${total}  (${pct}%)`;

  let msg = '';
  if (pct === 100) msg = 'Perfect! 🎉 Excellent work!';
  else if (pct >= 80) msg = 'Great job! Keep practicing!';
  else if (pct >= 60) msg = 'Good effort – review the ones you missed.';
  else msg = 'Keep studying – you will improve with practice!';

  document.getElementById('result-msg').textContent = msg;
  renderGrid(); // update learned marks
}

/* ══════════════════════════════════════════════════════════
   PROGRESS TAB
══════════════════════════════════════════════════════════ */
function renderProgress() {
  const total  = KANJI.length;
  const n5     = KANJI.filter(k => k.level === 'N5');
  const n4     = KANJI.filter(k => k.level === 'N4');
  const learnedAll = state.learned.size;
  const learnedN5  = n5.filter(k => state.learned.has(k.kanji)).length;
  const learnedN4  = n4.filter(k => state.learned.has(k.kanji)).length;

  document.getElementById('progress-overview').innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${learnedAll}</div>
      <div class="stat-label">Total Learned</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${total - learnedAll}</div>
      <div class="stat-label">Remaining</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${Math.round((learnedAll / total) * 100)}%</div>
      <div class="stat-label">Completion</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${learnedN5}</div>
      <div class="stat-label">N5 Learned</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${learnedN4}</div>
      <div class="stat-label">N4 Learned</div>
    </div>
  `;

  document.getElementById('progress-bars').innerHTML = `
    <div class="progress-bar-row">
      <label><span>N5 (${learnedN5} / ${n5.length})</span><span>${Math.round((learnedN5/n5.length)*100)}%</span></label>
      <div class="bar-track"><div class="bar-fill bar-n5" style="width:${(learnedN5/n5.length)*100}%"></div></div>
    </div>
    <div class="progress-bar-row">
      <label><span>N4 (${learnedN4} / ${n4.length})</span><span>${Math.round((learnedN4/n4.length)*100)}%</span></label>
      <div class="bar-track"><div class="bar-fill bar-n4" style="width:${(learnedN4/n4.length)*100}%"></div></div>
    </div>
    <div class="progress-bar-row">
      <label><span>All (${learnedAll} / ${total})</span><span>${Math.round((learnedAll/total)*100)}%</span></label>
      <div class="bar-track"><div class="bar-fill" style="width:${(learnedAll/total)*100}%;background:var(--primary)"></div></div>
    </div>
  `;

  const learnedKanji = KANJI.filter(k => state.learned.has(k.kanji));
  document.getElementById('learned-grid').innerHTML = learnedKanji.length
    ? learnedKanji.map(k => `
        <div class="kanji-card learned" data-kanji="${k.kanji}" title="${k.meanings[0]}" style="cursor:default;">
          <span class="learned-mark">✓</span>
          <span class="kchar">${k.kanji}</span>
          <span class="kmean">${k.meanings[0]}</span>
          <span class="level-badge ${k.level}">${k.level}</span>
        </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:.9rem;">No kanji marked as learned yet. Start browsing!</p>';
}

/* ── Reset Progress ──────────────────────────────────────── */
document.getElementById('reset-progress-btn').addEventListener('click', () => {
  if (confirm('Reset all progress? This cannot be undone.')) {
    state.learned.clear();
    saveLearnedState();
    renderGrid();
    renderProgress();
    toast('Progress reset.');
  }
});

/* ── Keyboard: close modal on Escape, navigate with arrows ─ */
document.addEventListener('keydown', e => {
  const panel = document.getElementById('detail-panel');
  if (!panel.classList.contains('open')) return;
  if (e.key === 'Escape') closeDetail();
  if (e.key === 'ArrowLeft')  document.getElementById('detail-prev').click();
  if (e.key === 'ArrowRight') document.getElementById('detail-next').click();
});

/* ── Init ───────────────────────────────────────────────── */
renderGrid();
updateHeaderStats();
