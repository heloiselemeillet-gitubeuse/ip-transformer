// image-gen.js — Écran 7 : Génération d'images via Flux Redux
// 3 images par épisode (1 par sous-scène)
// Auto-batch après validation de l'épisode 1

/** Épisode actuellement affiché dans la génération */
let currentGenEpisode = 1;

/** Statut des images générées : { [episodeNum]: [{ url, status, sceneIndex }] } */
let generatedImages = {};

/**
 * Initialise l'écran 7 — charge les images existantes ou lance la génération
 */
function initScreen7() {
  // Restaurer les images depuis State
  if (State.generatedImages) {
    generatedImages = State.generatedImages;
  }

  renderGenTabs();
  selectGenEpisode(1);
}

/**
 * Affiche les onglets d'épisode pour la génération
 */
function renderGenTabs() {
  const tabsEl = document.getElementById('gen-tabs');
  const episodes = State.episodes || [];

  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const images = generatedImages[num] || [];
    const allApproved = images.length === 3 && images.every(img => img.status === 'approved');
    return `
      <button class="episode-tab ${num === currentGenEpisode ? 'episode-tab--active' : ''} ${allApproved ? 'episode-tab--done' : ''}"
        onclick="selectGenEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        ${allApproved ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode pour la génération d'images
 * @param {number} episodeNum
 */
function selectGenEpisode(episodeNum) {
  currentGenEpisode = episodeNum;
  renderGenTabs();

  // Si des images existent, les afficher
  if (generatedImages[episodeNum] && generatedImages[episodeNum].length > 0) {
    displayGenImages(episodeNum);
  } else {
    // Sinon, lancer la génération
    generateEpisodeImages(episodeNum);
  }
}

/**
 * Génère les 3 images d'un épisode (1 par sous-scène)
 * @param {number} episodeNum
 */
async function generateEpisodeImages(episodeNum) {
  const resultEl = document.getElementById('screen-7-result');
  if (resultEl) resultEl.style.display = 'none';

  // Récupérer le script de l'épisode
  const script = State.scripts ? State.scripts[episodeNum] : null;
  if (!script || !script.scenes) {
    showLoading('screen-7-loading', 'claude', { message: 'Script non trouvé — retournez à l\'écran 5' });
    return;
  }

  // Initialiser le tableau d'images
  generatedImages[episodeNum] = [];

  const scenes = script.scenes;
  const total = scenes.length;

  showLoading('screen-7-loading', 'replicate', {
    message: `Génération des images — Épisode ${episodeNum}`,
    total: total,
    current: 1,
  });

  // Récupérer l'image de référence
  let imageRef = null;
  const refs = await dbGetAll(STORES.CHARACTER_REFS);
  if (refs.length > 0) {
    const blob = new Blob([refs[0].data], { type: refs[0].type });
    imageRef = await blobToBase64(blob);
  }

  // Style visuel choisi
  const visualStyle = State.visualStyle || {};
  const stylePrompt = visualStyle.stylePrompt || '';
  const palettePrompt = `${visualStyle.temperature || 'neutral'} palette, ${visualStyle.contrast || 'contrasted'} lighting`;

  // Générer chaque image séquentiellement avec délai anti rate-limit
  for (let i = 0; i < total; i++) {
    const scene = scenes[i];

    // Délai de 5s entre les appels Replicate (sauf le premier)
    if (i > 0) {
      updateLoadingProgress('screen-7-loading', ((i) / total) * 100, `Pause avant scène ${i + 1}… (anti rate-limit 10s)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    updateLoadingCounter('screen-7-loading', i + 1, total);
    updateLoadingProgress('screen-7-loading', ((i) / total) * 100, `Scène ${i + 1} — ${scene.title || ''}`);

    try {
      // Construire le prompt avec : description visuelle + style + ID IP + palette
      const canon = State.idIP || {};
      const prompt = buildImagePrompt(scene, stylePrompt, palettePrompt, canon);

      const imageUrl = await replicateGenerateImage(
        { prompt, imageRef, width: 720, height: 1280 },
        (progress) => {
          const basePercent = (i / total) * 100;
          const scenePercent = (progress.percent / 100) * (100 / total);
          updateLoadingProgress('screen-7-loading', basePercent + scenePercent, `Scène ${i + 1} — ${progress.status}`);
        }
      );

      generatedImages[episodeNum].push({
        sceneIndex: i,
        url: imageUrl,
        status: 'pending', // 'pending', 'approved', 'rejected'
        prompt: prompt,
      });

    } catch (err) {
      generatedImages[episodeNum].push({
        sceneIndex: i,
        url: null,
        status: 'error',
        error: err.message,
        prompt: '',
      });
    }
  }

  // Sauvegarder
  State.generatedImages = generatedImages;
  State.save();

  hideLoading('screen-7-loading');
  displayGenImages(episodeNum);
}

/**
 * Construit le prompt de génération d'image pour une scène
 * @param {Object} scene — sous-scène du script
 * @param {string} stylePrompt — style visuel
 * @param {string} palettePrompt — palette de couleurs
 * @param {Object} canon — ID IP
 * @returns {string}
 */
function buildImagePrompt(scene, stylePrompt, palettePrompt, canon) {
  const parts = [];

  // Description visuelle de la scène
  if (scene.visualDescription) parts.push(scene.visualDescription);

  // Style visuel
  if (stylePrompt) parts.push(stylePrompt);

  // Palette
  if (palettePrompt) parts.push(palettePrompt);

  // Cadrage
  if (scene.cameraNote) parts.push(scene.cameraNote);

  // Style visuel du canon
  if (canon.visualStyle) parts.push(canon.visualStyle);

  // Qualité
  parts.push('high quality, detailed');

  return parts.join(', ');
}

/**
 * Affiche les images générées pour un épisode
 * @param {number} episodeNum
 */
function displayGenImages(episodeNum) {
  hideLoading('screen-7-loading');

  const resultEl = document.getElementById('screen-7-result');
  if (resultEl) resultEl.style.display = 'block';

  const images = generatedImages[episodeNum] || [];
  const script = State.scripts ? State.scripts[episodeNum] : null;
  const scenes = (script && script.scenes) || [];

  const gridEl = document.getElementById('gen-images-grid');
  if (!gridEl) return;
  gridEl.innerHTML = images.map((img, i) => {
    const scene = scenes[i] || {};
    return `
      <div class="gen-image-card ${img.status === 'approved' && img.url ? 'gen-image-card--approved' : ''} ${img.status === 'error' || !img.url ? 'gen-image-card--error' : ''}">
        <div class="gen-image-card__header">
          <span class="gen-image-card__scene">Scène ${i + 1}</span>
          <span class="gen-image-card__title">${scene.title || ''}</span>
        </div>
        <div class="gen-image-card__preview">
          ${img.url
            ? `<img src="${img.url}" alt="Scène ${i + 1}" class="gen-image-card__img">`
            : `<div class="gen-image-card__error">${img.error || 'Erreur'}</div>`
          }
        </div>
        <div class="gen-image-card__actions">
          ${img.status === 'approved' && img.url
            ? `<span class="gen-image-card__badge gen-image-card__badge--approved">✓ Approuvée</span>
               <button class="btn btn--small btn--secondary" onclick="regenerateImage(${episodeNum}, ${i})">Régénérer</button>`
            : img.status === 'error' || !img.url
              ? `<button class="btn btn--small btn--primary" onclick="regenerateImage(${episodeNum}, ${i})">Régénérer</button>`
              : `<button class="btn btn--small btn--primary" onclick="approveImage(${episodeNum}, ${i})">Approuver</button>
                 <button class="btn btn--small btn--secondary" onclick="regenerateImage(${episodeNum}, ${i})">Régénérer</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  checkScreen7Ready();
}

/**
 * Approuve une image
 * @param {number} episodeNum
 * @param {number} imageIndex
 */
function approveImage(episodeNum, imageIndex) {
  const img = generatedImages[episodeNum] && generatedImages[episodeNum][imageIndex];
  if (img && img.url) {
    img.status = 'approved';
    State.generatedImages = generatedImages;
    State.save();
    displayGenImages(episodeNum);
  }
}

/**
 * Régénère une image spécifique
 * @param {number} episodeNum
 * @param {number} imageIndex
 */
async function regenerateImage(episodeNum, imageIndex) {
  const script = State.scripts ? State.scripts[episodeNum] : null;
  if (!script || !script.scenes || !script.scenes[imageIndex]) return;

  const scene = script.scenes[imageIndex];
  const visualStyle = State.visualStyle || {};
  const stylePrompt = visualStyle.stylePrompt || '';
  const palettePrompt = `${visualStyle.temperature || 'neutral'} palette, ${visualStyle.contrast || 'contrasted'} lighting`;
  const canon = State.idIP || {};

  // Marquer comme en cours
  generatedImages[episodeNum][imageIndex] = {
    sceneIndex: imageIndex,
    url: null,
    status: 'generating',
    prompt: '',
  };
  displayGenImages(episodeNum);

  // Mettre un spinner sur cette image
  const cards = document.querySelectorAll('.gen-image-card');
  if (cards[imageIndex]) {
    cards[imageIndex].querySelector('.gen-image-card__preview').innerHTML = `
      <div class="style-card__loading">
        <div class="loading__spinner"></div>
        <span>Régénération…</span>
      </div>
    `;
  }

  try {
    let imageRef = null;
    const refs = await dbGetAll(STORES.CHARACTER_REFS);
    if (refs.length > 0) {
      const blob = new Blob([refs[0].data], { type: refs[0].type });
      imageRef = await blobToBase64(blob);
    }

    const prompt = buildImagePrompt(scene, stylePrompt, palettePrompt, canon);
    const imageUrl = await replicateGenerateImage({ prompt, imageRef, width: 720, height: 1280 });

    generatedImages[episodeNum][imageIndex] = {
      sceneIndex: imageIndex,
      url: imageUrl,
      status: 'pending',
      prompt: prompt,
    };
  } catch (err) {
    generatedImages[episodeNum][imageIndex] = {
      sceneIndex: imageIndex,
      url: null,
      status: 'error',
      error: err.message,
      prompt: '',
    };
  }

  State.generatedImages = generatedImages;
  State.save();
  displayGenImages(episodeNum);
}

/**
 * Lance l'auto-batch : génère les épisodes 2-5 après validation de l'épisode 1
 */
async function startAutoBatch() {
  const btn = document.getElementById('btn-auto-batch');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Auto-batch en cours…';
  }

  for (let ep = 2; ep <= 5; ep++) {
    if (!generatedImages[ep] || generatedImages[ep].length === 0) {
      await generateEpisodeImages(ep);
    }
  }

  if (btn) {
    btn.textContent = '✓ Auto-batch terminé';
  }

  renderGenTabs();
}

/**
 * Approuve toutes les images en attente d'un épisode
 * @param {number} episodeNum — numéro de l'épisode
 */
function approveAllImages(episodeNum) {
  if (!generatedImages[episodeNum]) return;
  generatedImages[episodeNum].forEach(img => {
    if (img.url && img.status !== 'error') img.status = 'approved';
  });
  State.generatedImages = generatedImages;
  State.save();
  displayGenImages(episodeNum);
}

/**
 * Vérifie si l'écran 7 est prêt (au moins épisode 1 toutes images approuvées)
 */
function checkScreen7Ready() {
  const ep1Images = generatedImages[1] || [];
  const ep1AllApproved = ep1Images.length === 3 && ep1Images.every(img => img.status === 'approved' && img.url);

  const btn = document.getElementById('btn-next-screen7');
  if (btn) btn.disabled = !ep1AllApproved;

  // Afficher le bouton auto-batch si épisode 1 validé
  const batchBtn = document.getElementById('btn-auto-batch');
  if (batchBtn) {
    batchBtn.style.display = ep1AllApproved ? 'inline-block' : 'none';
  }

  // Afficher/masquer le bouton "Tout approuver"
  const currentImages = generatedImages[currentGenEpisode] || [];
  const hasPending = currentImages.some(img => img.url && img.status !== 'approved' && img.status !== 'error');
  const approveAllBtn = document.getElementById('btn-approve-all');
  if (approveAllBtn) {
    approveAllBtn.style.display = hasPending ? 'inline-flex' : 'none';
  }
}
