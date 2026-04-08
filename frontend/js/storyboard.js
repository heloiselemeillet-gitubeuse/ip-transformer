// storyboard.js — Écran 8 : Vue storyboard + preview slideshow + export
// 3 images en ligne par épisode avec transitions et dialogues

/** Épisode actuellement affiché dans le storyboard */
let currentStoryboardEpisode = 1;

/** Index de la slide active dans le slideshow */
let slideshowIndex = 0;
let slideshowTimer = null;

/**
 * Initialise l'écran 8 — affiche le storyboard du premier épisode
 */
function initScreen8() {
  renderStoryboardTabs();
  selectStoryboardEpisode(1);
}

/**
 * Affiche les onglets d'épisode pour le storyboard
 */
function renderStoryboardTabs() {
  const tabsEl = document.getElementById('storyboard-tabs');
  const episodes = State.episodes || [];

  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    return `
      <button class="episode-tab ${num === currentStoryboardEpisode ? 'episode-tab--active' : ''}"
        onclick="selectStoryboardEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode pour le storyboard
 * @param {number} episodeNum
 */
function selectStoryboardEpisode(episodeNum) {
  currentStoryboardEpisode = episodeNum;
  renderStoryboardTabs();
  displayStoryboard(episodeNum);
  stopSlideshow();
}

/**
 * Affiche le storyboard d'un épisode : 3 images + transitions + dialogues
 * @param {number} episodeNum
 */
function displayStoryboard(episodeNum) {
  const images = getBankImagesForEpisode(episodeNum);
  const script = State.scripts ? State.scripts[episodeNum] : null;
  const scenes = (script && script.scenes) || [];

  const container = document.getElementById('storyboard-content');

  if (images.length === 0) {
    container.innerHTML = '<div class="card"><p class="status--error">Aucune image générée pour cet épisode. Retournez à l\'écran 7.</p></div>';
    return;
  }

  container.innerHTML = `
    <!-- Vue storyboard : 3 images en ligne -->
    <div class="storyboard-strip">
      ${images.map((img, i) => {
        const scene = scenes[i] || {};
        const dialogues = scene.dialogue || [];
        return `
          <div class="storyboard-panel" data-index="${i}">
            <div class="storyboard-panel__img-wrap">
              ${img.url
                ? `<img src="${img.url}" alt="Scène ${i + 1}" class="storyboard-panel__img">`
                : '<div class="storyboard-panel__missing">Image manquante</div>'
              }
              <!-- Bulles de dialogue superposées -->
              ${dialogues.map((d, di) => `
                <div class="storyboard-bubble" style="bottom:${5 + di * 18}%; ${di % 2 === 0 ? 'left:5%' : 'right:5%'}">
                  <span class="storyboard-bubble__speaker">${d.speaker}</span>
                  <span class="storyboard-bubble__text">"${d.text}"</span>
                </div>
              `).join('')}
            </div>
            <div class="storyboard-panel__info">
              <span class="storyboard-panel__num">Scène ${i + 1}</span>
              <span class="storyboard-panel__mood">${scene.mood || ''}</span>
            </div>
            ${i < images.length - 1 ? '<div class="storyboard-transition">→</div>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Activer le bouton Continuer
  const btn = document.getElementById('btn-next-screen8');
  if (btn) btn.disabled = false;
}

/**
 * Lance le slideshow CSS : affiche les images une par une avec transition
 */
function startSlideshow() {
  const images = getBankImagesForEpisode(currentStoryboardEpisode);
  const script = State.scripts ? State.scripts[currentStoryboardEpisode] : null;
  const scenes = (script && script.scenes) || [];

  if (images.length === 0) return;

  slideshowIndex = 0;

  const overlay = document.getElementById('slideshow-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="slideshow">
      <button class="slideshow__close" onclick="stopSlideshow()">✕</button>
      <div class="slideshow__image-wrap">
        <img id="slideshow-img" class="slideshow__img" src="${images[0].url || ''}" alt="Slide">
        <div id="slideshow-dialogues" class="slideshow__dialogues"></div>
      </div>
      <div class="slideshow__controls">
        <button class="btn btn--secondary btn--small" onclick="slideshowPrev()">← Précédent</button>
        <span class="slideshow__counter" id="slideshow-counter">1 / ${images.length}</span>
        <button class="btn btn--secondary btn--small" onclick="slideshowNext()">Suivant →</button>
      </div>
      <div class="slideshow__info">
        <h4 id="slideshow-title">${scenes[0] ? scenes[0].title : ''}</h4>
        <p id="slideshow-mood">${scenes[0] ? scenes[0].mood : ''}</p>
      </div>
    </div>
  `;

  updateSlideshowDialogues(0, scenes);

  // Auto-play toutes les 5 secondes
  slideshowTimer = setInterval(() => slideshowNext(), 5000);
}

/**
 * Passe à la slide suivante
 */
function slideshowNext() {
  const images = getBankImagesForEpisode(currentStoryboardEpisode);
  if (images.length === 0) return;

  slideshowIndex = (slideshowIndex + 1) % images.length;
  updateSlideshow();
}

/**
 * Passe à la slide précédente
 */
function slideshowPrev() {
  const images = getBankImagesForEpisode(currentStoryboardEpisode);
  if (images.length === 0) return;

  slideshowIndex = (slideshowIndex - 1 + images.length) % images.length;
  updateSlideshow();
}

/**
 * Met à jour l'affichage du slideshow
 */
function updateSlideshow() {
  const images = getBankImagesForEpisode(currentStoryboardEpisode);
  const script = State.scripts ? State.scripts[currentStoryboardEpisode] : null;
  const scenes = (script && script.scenes) || [];

  const img = document.getElementById('slideshow-img');
  const counter = document.getElementById('slideshow-counter');
  const title = document.getElementById('slideshow-title');
  const mood = document.getElementById('slideshow-mood');

  if (img && images[slideshowIndex]) {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = images[slideshowIndex].url || '';
      img.style.opacity = '1';
    }, 200);
  }

  if (counter) counter.textContent = `${slideshowIndex + 1} / ${images.length}`;
  if (title && scenes[slideshowIndex]) title.textContent = scenes[slideshowIndex].title || '';
  if (mood && scenes[slideshowIndex]) mood.textContent = scenes[slideshowIndex].mood || '';

  updateSlideshowDialogues(slideshowIndex, scenes);
}

/**
 * Met à jour les dialogues du slideshow
 * @param {number} index — index de la scène
 * @param {Array} scenes — scènes du script
 */
function updateSlideshowDialogues(index, scenes) {
  const container = document.getElementById('slideshow-dialogues');
  if (!container || !scenes[index]) return;

  const dialogues = scenes[index].dialogue || [];
  container.innerHTML = dialogues.map(d => `
    <div class="slideshow__dialogue-line">
      <span class="slideshow__dialogue-speaker">${d.speaker}</span>
      <span class="slideshow__dialogue-text">"${d.text}"</span>
    </div>
  `).join('');
}

/**
 * Arrête le slideshow
 */
function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
  const overlay = document.getElementById('slideshow-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Exporte le storyboard en HTML autonome
 */
function exportStoryboardHTML() {
  const episodeNum = currentStoryboardEpisode;
  const images = getBankImagesForEpisode(episodeNum);
  const script = State.scripts ? State.scripts[episodeNum] : null;
  const scenes = (script && script.scenes) || [];
  const episode = (State.episodes || [])[episodeNum - 1] || {};

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Storyboard — EP ${episodeNum} : ${episode.title || ''}</title>
  <style>
    body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #f1f5f9; margin: 0; padding: 40px; }
    h1 { text-align: center; color: #7c3aed; margin-bottom: 32px; }
    .strip { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
    .panel { width: 300px; border: 1px solid #334155; border-radius: 12px; overflow: hidden; background: #1a1a2e; }
    .panel img { width: 100%; display: block; }
    .panel-info { padding: 16px; }
    .panel-info h3 { font-size: 16px; margin: 0 0 8px; }
    .panel-info p { font-size: 13px; color: #94a3b8; margin: 0; }
    .dialogue { margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155; }
    .dialogue-line { margin-bottom: 6px; }
    .speaker { color: #7c3aed; font-weight: 600; font-size: 13px; }
    .text { font-size: 13px; font-style: italic; }
  </style>
</head>
<body>
  <h1>EP ${episodeNum} — ${episode.title || ''}</h1>
  <div class="strip">
    ${images.map((img, i) => {
      const scene = scenes[i] || {};
      const dialogues = scene.dialogue || [];
      return `
        <div class="panel">
          ${img.url ? `<img src="${img.url}" alt="Scène ${i + 1}">` : ''}
          <div class="panel-info">
            <h3>Scène ${i + 1} — ${scene.title || ''}</h3>
            <p>${scene.mood || ''}</p>
            ${dialogues.length > 0 ? `
              <div class="dialogue">
                ${dialogues.map(d => `
                  <div class="dialogue-line">
                    <span class="speaker">${d.speaker} :</span>
                    <span class="text">"${d.text}"</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>
</body>
</html>`;

  // Télécharger le fichier HTML
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `storyboard-ep${episodeNum}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
