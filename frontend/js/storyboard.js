// storyboard.js — Écran 8 : Storyboard avec images de scène générées
// Chaque scène obtient une image unique qui mixe personnage + décor
// Boutons régénérer/supprimer par image, bulles positionnées intelligemment

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
    const hasImages = State.storyboardImages && State.storyboardImages[num];
    return `
      <button class="episode-tab ${num === currentStoryboardEpisode ? 'episode-tab--active' : ''} ${hasImages ? 'episode-tab--done' : ''}"
        onclick="selectStoryboardEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        ${hasImages ? '<span class="episode-tab__check">✓</span>' : ''}
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

// ============================================================
// GÉNÉRATION D'IMAGES DE SCÈNE
// ============================================================

/**
 * Construit un prompt de scène qui mixe personnage + lieu + action
 * Utilise les vrais champs de ID IP (style, univers, palette, ton)
 */
function buildScenePrompt(scene, sceneIndex) {
  const ctx = getFullStyleContext();
  const canon = State.idIP || {};
  const isManga = /manga|anime|manhwa|webtoon/i.test(ctx.stylePrompt || '');
  const styleKeyword = isManga ? 'manga anime' : (ctx.stylePrompt || 'illustration').split(',')[0].trim();

  // Extraire les personnages mentionnés dans la scène
  const speakers = (scene.dialogue || []).map(d => d.speaker).filter(Boolean);
  const charNames = [...new Set(speakers)];
  const charDescriptions = charNames.map(name => {
    const char = (canon.characters || []).find(c => c.name && c.name.toLowerCase() === name.toLowerCase());
    return char ? `${char.name}: ${(char.description || '').substring(0, 80)}` : name;
  }).join(', ');

  // Trouver le lieu le plus pertinent pour cette scène
  const sceneText = `${scene.visualDescription || ''} ${scene.title || ''}`.toLowerCase();
  const matchedLoc = (canon.locations || []).find(loc =>
    loc.name && sceneText.includes(loc.name.toLowerCase())
  );
  const locDesc = matchedLoc
    ? `setting: ${matchedLoc.name}, ${(matchedLoc.description || '').substring(0, 80)}`
    : '';

  const parts = [];

  // 1. Style visuel (priorité max)
  if (isManga) {
    parts.push('manga art, anime illustration, Japanese manga style, bold ink outlines, cel-shaded, 2D hand-drawn');
  } else {
    parts.push(ctx.stylePrompt || 'illustration');
  }

  // 2. Univers
  if (ctx.universe) parts.push(ctx.universe.substring(0, 100));

  // 3. Palette
  if (ctx.palette) parts.push(ctx.palette);

  // 4. Ton
  if (ctx.tone) parts.push(`mood: ${ctx.tone.substring(0, 60)}`);

  // 5. Description visuelle de la scène (le plus important pour le contenu)
  if (scene.visualDescription) {
    parts.push(scene.visualDescription.substring(0, 200));
  }

  // 6. Personnages dans la scène
  if (charDescriptions) parts.push(`characters: ${charDescriptions}`);

  // 7. Lieu
  if (locDesc) parts.push(locDesc);

  // 8. Ambiance de la scène
  if (scene.mood) parts.push(`atmosphere: ${scene.mood}`);

  // 9. Qualité + renforcement style
  parts.push(`${styleKeyword} illustration, cinematic composition, high quality`);

  if (isManga) {
    parts.push('consistent manga anime style, NOT photorealistic, NOT 3D render, NOT photograph');
  } else {
    parts.push(`consistent ${styleKeyword}, NOT photorealistic, NOT photo`);
  }

  return parts.join(', ');
}

/**
 * Génère toutes les images de scène pour l'épisode courant
 */
async function generateStoryboardImages() {
  const episodeNum = currentStoryboardEpisode;
  const script = State.scripts && State.scripts[episodeNum];
  if (!script || !script.scenes) {
    alert('Script non trouvé. Retournez à l\'étape Scripts.');
    return;
  }

  const scenes = script.scenes;
  const total = scenes.length;

  if (!State.storyboardImages) State.storyboardImages = {};
  if (!State.storyboardImages[episodeNum]) State.storyboardImages[episodeNum] = [];

  showLoading('screen-8-loading', 'replicate', {
    message: `Génération des images de scène EP${episodeNum}`,
    total,
    current: 1,
  });

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const existing = State.storyboardImages[episodeNum][i];

    // Skip si image déjà générée et approuvée
    if (existing && existing.url && existing.status === 'approved') continue;

    // Délai anti rate-limit (sauf première)
    if (i > 0) {
      updateLoadingProgress('screen-8-loading', ((i) / total) * 100, 'Pause anti rate-limit…');
      await new Promise(r => setTimeout(r, 12000));
    }

    updateLoadingCounter('screen-8-loading', i + 1, total);
    updateLoadingProgress('screen-8-loading', (i / total) * 100, `Scène ${i + 1} : ${scene.title || ''}`);

    const prompt = buildScenePrompt(scene, i);

    try {
      const imageUrl = await replicateGenerateImage({ prompt });
      State.storyboardImages[episodeNum][i] = {
        sceneIndex: i,
        url: imageUrl,
        prompt,
        status: 'pending',
      };
    } catch (err) {
      State.storyboardImages[episodeNum][i] = {
        sceneIndex: i,
        url: null,
        prompt,
        status: 'error',
        error: err.message,
      };
    }

    State.save();
    displayStoryboard(episodeNum);
  }

  hideLoading('screen-8-loading');
  displayStoryboard(episodeNum);
}

/**
 * Régénère l'image d'une seule scène
 */
async function regenStoryboardScene(episodeNum, sceneIndex) {
  const script = State.scripts && State.scripts[episodeNum];
  if (!script || !script.scenes || !script.scenes[sceneIndex]) return;

  if (!State.storyboardImages) State.storyboardImages = {};
  if (!State.storyboardImages[episodeNum]) State.storyboardImages[episodeNum] = [];

  // Marquer comme en cours
  State.storyboardImages[episodeNum][sceneIndex] = {
    sceneIndex,
    url: null,
    status: 'generating',
    prompt: '',
  };
  displayStoryboard(episodeNum);

  const scene = script.scenes[sceneIndex];
  const prompt = buildScenePrompt(scene, sceneIndex);

  try {
    const imageUrl = await replicateGenerateImage({ prompt });
    State.storyboardImages[episodeNum][sceneIndex] = {
      sceneIndex,
      url: imageUrl,
      prompt,
      status: 'pending',
    };
  } catch (err) {
    State.storyboardImages[episodeNum][sceneIndex] = {
      sceneIndex,
      url: null,
      prompt,
      status: 'error',
      error: err.message,
    };
  }

  State.save();
  displayStoryboard(episodeNum);
}

/**
 * Supprime l'image d'une scène du storyboard
 */
function deleteStoryboardScene(episodeNum, sceneIndex) {
  if (!State.storyboardImages || !State.storyboardImages[episodeNum]) return;
  State.storyboardImages[episodeNum][sceneIndex] = {
    sceneIndex,
    url: null,
    status: 'empty',
    prompt: '',
  };
  State.save();
  displayStoryboard(episodeNum);
}

/**
 * Approuve l'image d'une scène
 */
function approveStoryboardScene(episodeNum, sceneIndex) {
  if (!State.storyboardImages || !State.storyboardImages[episodeNum]) return;
  const img = State.storyboardImages[episodeNum][sceneIndex];
  if (img && img.url) {
    img.status = 'approved';
    State.save();
    displayStoryboard(episodeNum);
  }
}

// ============================================================
// AFFICHAGE DU STORYBOARD
// ============================================================

/**
 * Affiche le storyboard d'un épisode avec images de scène + bulles
 */
function displayStoryboard(episodeNum) {
  const script = State.scripts ? State.scripts[episodeNum] : null;
  const scenes = (script && script.scenes) || [];
  const storyImages = (State.storyboardImages && State.storyboardImages[episodeNum]) || [];

  const container = document.getElementById('storyboard-content');

  if (scenes.length === 0) {
    container.innerHTML = '<div class="card"><p class="status--error">Aucun script pour cet épisode. Retournez à l\'étape Scripts.</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="storyboard-strip">
      ${scenes.map((scene, i) => {
        const img = storyImages[i] || {};
        const dialogues = scene.dialogue || [];
        const hasImage = !!img.url;
        const isGenerating = img.status === 'generating';
        const isError = img.status === 'error';
        const isApproved = img.status === 'approved';
        const isPending = hasImage && !isApproved && !isError;

        return `
          <div class="storyboard-panel" data-index="${i}">
            <div class="storyboard-panel__img-wrap">
              ${hasImage
                ? `<img src="${img.url}" alt="Scène ${i + 1}" class="storyboard-panel__img">`
                : isGenerating
                  ? `<div class="storyboard-panel__loading"><div class="loading__spinner"></div><span>Génération…</span></div>`
                  : isError
                    ? `<div class="storyboard-panel__error">${img.error || 'Erreur'}</div>`
                    : `<div class="storyboard-panel__empty">
                         <span style="font-size:32px;">🎬</span>
                         <span>Pas encore généré</span>
                       </div>`
              }
              <!-- Bulles de dialogue superposées — positionnées en bas, ordonnées -->
              ${hasImage ? dialogues.map((d, di) => {
                // Position intelligente : en bas de l'image, alterner gauche/droite
                // Plus il y a de bulles, plus elles remontent
                const totalBubbles = dialogues.length;
                const yBase = 78 - (totalBubbles - 1) * 10; // Remonter si plusieurs bulles
                const yPos = yBase + di * 12;
                const xPos = di % 2 === 0 ? 3 : 48;
                return `
                  <div class="storyboard-bubble" style="bottom:auto; top:${yPos}%; ${di % 2 === 0 ? `left:${xPos}%` : `right:3%`}">
                    <span class="storyboard-bubble__speaker">${d.speaker}</span>
                    <span class="storyboard-bubble__text">"${(d.text || '').substring(0, 60)}${(d.text || '').length > 60 ? '…' : ''}"</span>
                  </div>
                `;
              }).join('') : ''}
            </div>
            <div class="storyboard-panel__info">
              <span class="storyboard-panel__num">Scène ${i + 1}</span>
              <span class="storyboard-panel__title">${scene.title || ''}</span>
              <span class="storyboard-panel__mood">${scene.mood || ''}</span>
            </div>
            <div class="storyboard-panel__actions">
              ${isApproved
                ? `<span class="gen-image-card__badge gen-image-card__badge--approved">✓</span>
                   <button class="btn btn--small btn--secondary" onclick="regenStoryboardScene(${episodeNum}, ${i})">Régénérer</button>`
                : isError
                  ? `<button class="btn btn--small btn--primary" onclick="regenStoryboardScene(${episodeNum}, ${i})">Réessayer</button>`
                : isPending
                  ? `<button class="btn btn--small btn--primary" onclick="approveStoryboardScene(${episodeNum}, ${i})">Approuver</button>
                     <button class="btn btn--small btn--secondary" onclick="regenStoryboardScene(${episodeNum}, ${i})">Régénérer</button>
                     <button class="btn--icon-delete" onclick="deleteStoryboardScene(${episodeNum}, ${i})" title="Supprimer">✕</button>`
                : isGenerating
                  ? ''
                  : `<button class="btn btn--small btn--primary" onclick="regenStoryboardScene(${episodeNum}, ${i})">Générer</button>`
              }
            </div>
            ${i < scenes.length - 1 ? '<div class="storyboard-transition">→</div>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Activer le bouton Continuer si au moins une image existe
  const hasAnyImage = storyImages.some(img => img && img.url);
  const btn = document.getElementById('btn-next-screen8');
  if (btn) btn.disabled = !hasAnyImage;
}

// ============================================================
// SLIDESHOW
// ============================================================

/**
 * Lance le slideshow : affiche les images une par une avec transition
 */
function startSlideshow() {
  const storyImages = (State.storyboardImages && State.storyboardImages[currentStoryboardEpisode]) || [];
  const script = State.scripts ? State.scripts[currentStoryboardEpisode] : null;
  const scenes = (script && script.scenes) || [];
  const images = storyImages.filter(img => img && img.url);

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
        <h4 id="slideshow-title">${scenes[images[0].sceneIndex] ? scenes[images[0].sceneIndex].title : ''}</h4>
        <p id="slideshow-mood">${scenes[images[0].sceneIndex] ? scenes[images[0].sceneIndex].mood : ''}</p>
      </div>
    </div>
  `;

  updateSlideshowDialogues(images[0].sceneIndex, scenes);
  slideshowTimer = setInterval(() => slideshowNext(), 5000);
}

function slideshowNext() {
  const images = ((State.storyboardImages && State.storyboardImages[currentStoryboardEpisode]) || []).filter(img => img && img.url);
  if (images.length === 0) return;
  slideshowIndex = (slideshowIndex + 1) % images.length;
  updateSlideshow();
}

function slideshowPrev() {
  const images = ((State.storyboardImages && State.storyboardImages[currentStoryboardEpisode]) || []).filter(img => img && img.url);
  if (images.length === 0) return;
  slideshowIndex = (slideshowIndex - 1 + images.length) % images.length;
  updateSlideshow();
}

function updateSlideshow() {
  const images = ((State.storyboardImages && State.storyboardImages[currentStoryboardEpisode]) || []).filter(img => img && img.url);
  const script = State.scripts ? State.scripts[currentStoryboardEpisode] : null;
  const scenes = (script && script.scenes) || [];

  const currentImg = images[slideshowIndex];
  const img = document.getElementById('slideshow-img');
  const counter = document.getElementById('slideshow-counter');
  const title = document.getElementById('slideshow-title');
  const mood = document.getElementById('slideshow-mood');

  if (img && currentImg) {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = currentImg.url || '';
      img.style.opacity = '1';
    }, 200);
  }

  if (counter) counter.textContent = `${slideshowIndex + 1} / ${images.length}`;
  const scene = scenes[currentImg.sceneIndex] || {};
  if (title) title.textContent = scene.title || '';
  if (mood) mood.textContent = scene.mood || '';

  updateSlideshowDialogues(currentImg.sceneIndex, scenes);
}

function updateSlideshowDialogues(sceneIndex, scenes) {
  const container = document.getElementById('slideshow-dialogues');
  if (!container || !scenes[sceneIndex]) return;

  const dialogues = scenes[sceneIndex].dialogue || [];
  container.innerHTML = dialogues.map(d => `
    <div class="slideshow__dialogue-line">
      <span class="slideshow__dialogue-speaker">${d.speaker}</span>
      <span class="slideshow__dialogue-text">"${d.text}"</span>
    </div>
  `).join('');
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
  const overlay = document.getElementById('slideshow-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ============================================================
// EXPORT HTML
// ============================================================

function exportStoryboardHTML() {
  const episodeNum = currentStoryboardEpisode;
  const storyImages = (State.storyboardImages && State.storyboardImages[episodeNum]) || [];
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
    ${scenes.map((scene, i) => {
      const img = storyImages[i] || {};
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

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `storyboard-ep${episodeNum}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
