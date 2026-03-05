# 漢字学習 – Kanji Study App

A static web app for learning Japanese **JLPT N5 and N4 kanji** with animated stroke-order display (just like [kakijun.jp](https://kakijun.jp)), quizzes, and progress tracking.

**Live demo** → `https://<your-username>.github.io/<repo-name>/`

---

## Features

| Feature | Detail |
|---|---|
| **Stroke order animation** | Watch each stroke animate one-by-one, step through manually, or use draw-quiz mode |
| **270+ kanji** | Full JLPT N5 (≈100) + N4 (≈170) sets with meanings, on'yomi, kun'yomi and example words |
| **Quiz mode** | Kanji → Meaning, Meaning → Kanji, or Kanji → Reading; 10 / 20 / 40 questions |
| **Progress tracking** | Learned state saved in `localStorage`; visual progress bars per level |
| **Responsive** | Works on desktop and mobile |
| **No build step** | Pure HTML + CSS + JS — deploy directly to GitHub Pages |

---

## Project Structure

```
kanjikakijun/
├── index.html          ← Single-page app entry point
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── data.js         ← JLPT N5 + N4 kanji database
│   └── app.js          ← Application logic
└── README.md
```

---

## How to Deploy on GitHub Pages

### 1 — Create a GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: Kanji Study App"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### 2 — Enable GitHub Pages

1. Go to your repository on GitHub.
2. Click **Settings** → **Pages** (left sidebar).
3. Under **Source**, select **Deploy from a branch**.
4. Choose branch `main` and folder `/ (root)`.
5. Click **Save**.

After a minute, your site will be live at:
```
https://<your-username>.github.io/<repo-name>/
```

### 3 — (Optional) Custom Domain

In **Settings → Pages → Custom domain**, enter your domain (e.g. `kanji.yourdomain.com`), then add a `CNAME` file at the repo root containing just that domain.

---

## Usage

### Browse Tab
- Browse all kanji in a grid.
- Filter by **N5**, **N4**, or **Learned** using the filter buttons.
- Search by kanji character, English meaning, or reading.
- Click any card to open the detail modal.

### Detail Modal (`kjanidiv` stroke-order panel)
| Button | Action |
|---|---|
| ▶ Animate | Play full stroke-order animation |
| Step → | Animate one stroke at a time |
| ↺ Reset | Clear the drawing |
| ✏ Quiz | Interactive drawing test — draw each stroke yourself |
| ✓ Mark as Learned | Saves the kanji to your progress |

Numbered circles below the canvas let you jump to any specific stroke.

### Quiz Tab
Choose:
- **Question type** — Kanji → Meaning, Meaning → Kanji, or Kanji → Reading
- **Level** — All, N5 only, or N4 only
- **Question count** — 10, 20, or 40

Answering correctly automatically marks the kanji as learned.

### Progress Tab
- Overview statistics (total learned, completion %)
- Progress bars per JLPT level
- Grid of all learned kanji

---

## Technologies Used

| Library | Purpose |
|---|---|
| [Hanzi Writer](https://hanziwriter.org/) v3.5 | SVG stroke-order animations (KanjiVG data) |
| [KanjiVG / hanzi-writer-data](https://github.com/vercel/hanzi-writer-data) | Stroke path data served via jsDelivr CDN |
| [Noto Serif JP](https://fonts.google.com/noto/specimen/Noto+Serif+JP) | Kanji typeface (Google Fonts) |

No frameworks. No build tools. Just HTML, CSS and vanilla JavaScript.

---

## Data Sources

- Kanji meanings, readings and examples are hand-curated from JLPT study resources.
- Stroke-order SVG data is loaded on demand from:
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/{unicode}.json`
  (requires an internet connection at runtime).

---

## License

MIT — free to use, modify and distribute.
