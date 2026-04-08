// video-gen.js — Écran 10 : Génération des clips vidéo
// Wan 2.1 pour les clips IA, Ken Burns placeholder pour les zooms
// Approve/Regenerate par clip, auto-batch épisodes 2-5

/** Épisode actuellement sélectionné pour la génération vidéo */
let currentVideoEpisode = 1;

/**
 * Initialise l'écran 10 — génération de clips vidéo
 */
function initScreen10() {
  // Initialiser les clips générés dans State si nécessaire
  if (!State.generatedClips) {
    State.generatedClips = {};
  }

  renderVideoTabs();
  selectVideoEpisode(1);
}

/**
 * Affiche les onglets épisodes pour la génération vidéo
 */
function renderVideoTabs() {
  const tabsEl = document.getElementById('video-tabs');
  if (!tabsEl) return;

  const episodes = State.episodes || [];
  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const clips = State.generatedClips && State.generatedClips[num];
    const allApproved = clips && Object.values(clips).every(c => c.status === 'approved');
    return `
      <button class="episode-tab ${num === currentVideoEpisode ? 'episode-tab--active' : ''} ${allApproved ? 'episode-tab--done' : ''}"
        onclick="selectVideoEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        <span class="episode-tab__title">${ep.title || ''}</span>
        ${allApproved ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode et affiche ses clips
 * @param {number} episodeNum — numéro de l'épisode (1-5)
 */
function selectVideoEpisode(episodeNum) {
  currentVideoEpisode = episodeNum;
  renderVideoTabs();
  displayVideoClips(episodeNum);
}

/**
 * Affiche les clips vidéo (générés ou à générer) pour un épisode
 * @param {number} episodeNum — numéro de l'épisode
 */
function displayVideoClips(episodeNum) {
  const container = document.getElementById('video-clips-grid');
  if (!container) return;

  const resultEl = document.getElementById('screen-10-result');
  if (resultEl) resultEl.style.display = 'block';

  const script = State.scripts && State.scripts[episodeNum];
  if (!script || !script.scenes) {
    container.innerHTML = '<div class="card"><p class="status--error">Script de l\'épisode non trouvé.</p></div>';
    return;
  }

  const animConfig = (State.animationConfig && State.animationConfig[episodeNum]) || {};
  const clips = (State.generatedClips && State.generatedClips[episodeNum]) || {};

  container.innerHTML = script.scenes.map((scene, i) => {
    const sceneNum = scene.sceneNumber || i + 1;
    const config = animConfig[sceneNum] || { type: 'wan' };
    const clip = clips[sceneNum];

    return `
      <div class="video-clip-card" data-scene="${sceneNum}">
        <div class="video-clip-card__header">
          <span class="scene-card__number">Scène ${sceneNum}</span>
          <span class="video-clip-card__type ${config.type === 'wan' ? 'video-clip-card__type--wan' : 'video-clip-card__type--kb'}">
            ${config.type === 'wan' ? '🎬 Wan' : '🖼️ Ken Burns'}
          </span>
        </div>

        <div class="video-clip-card__preview">
          ${clip && clip.url ? `
            <video class="video-clip-card__video" src="${clip.url}" controls preload="metadata"></video>
          ` : clip && clip.status === 'generating' ? `
            <div class="video-clip-card__generating">
              <div class="spinner"></div>
              <p>Génération en cours…</p>
              <div class="progress-bar"><div class="progress-bar__fill" id="clip-progress-${episodeNum}-${sceneNum}" style="width: 0%"></div></div>
            </div>
          ` : `
            <div class="video-clip-card__empty">
              <span>${config.type === 'wan' ? '🎬' : '🖼️'}</span>
              <p>Clip non généré</p>
            </div>
          `}
        </div>

        <p class="video-clip-card__desc">${(scene.visualDescription || '').substring(0, 100)}…</p>

        <div class="video-clip-card__actions">
          ${clip && clip.url && clip.status !== 'approved' ? `
            <button class="btn btn--success btn--small" onclick="approveClip(${episodeNum}, ${sceneNum})">Approuver</button>
            <button class="btn btn--secondary btn--small" onclick="regenerateClip(${episodeNum}, ${sceneNum})">Régénérer</button>
          ` : clip && clip.status === 'approved' ? `
            <span class="status--success">✓ Approuvé</span>
            <button class="btn btn--secondary btn--small" onclick="regenerateClip(${episodeNum}, ${sceneNum})">Régénérer</button>
          ` : clip && clip.status === 'generating' ? `
            <span class="status--info">Génération…</span>
          ` : `
            <button class="btn btn--primary btn--small" onclick="generateClip(${episodeNum}, ${sceneNum})">Générer</button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Bouton générer tout l'épisode
  const genAllEl = document.getElementById('btn-gen-all-clips');
  if (genAllEl) {
    const allDone = script.scenes.every((s, i) => {
      const sn = s.sceneNumber || i + 1;
      return clips[sn] && clips[sn].url;
    });
    genAllEl.style.display = allDone ? 'none' : 'inline-flex';
  }

  // Bouton auto-batch
  const batchEl = document.getElementById('btn-video-auto-batch');
  if (batchEl) {
    const ep1Clips = State.generatedClips && State.generatedClips[1];
    const ep1AllApproved = ep1Clips && Object.values(ep1Clips).every(c => c.status === 'approved');
    batchEl.style.display = ep1AllApproved ? 'inline-flex' : 'none';
  }

  checkScreen10Ready();
}

/**
 * Génère un clip vidéo pour une sous-scène
 * @param {number} ep — numéro épisode
 * @param {number} sceneNum — numéro sous-scène
 */
async function generateClip(ep, sceneNum) {
  const animConfig = (State.animationConfig && State.animationConfig[ep]) || {};
  const config = animConfig[sceneNum] || { type: 'wan' };

  // Marquer comme en cours
  if (!State.generatedClips[ep]) State.generatedClips[ep] = {};
  State.generatedClips[ep][sceneNum] = { status: 'generating', url: null };
  State.save();
  displayVideoClips(ep);

  try {
    if (config.type === 'wan') {
      await generateWanClip(ep, sceneNum);
    } else {
      await generateKenBurnsClip(ep, sceneNum);
    }
  } catch (err) {
    console.error(`Erreur génération clip EP${ep} S${sceneNum}:`, err);
    State.generatedClips[ep][sceneNum] = { status: 'error', url: null, error: err.message };
    State.save();
    displayVideoClips(ep);
  }
}

/**
 * Génère un clip via Wan 2.1 (IA vidéo)
 * @param {number} ep — numéro épisode
 * @param {number} sceneNum — numéro sous-scène
 */
async function generateWanClip(ep, sceneNum) {
  const script = State.scripts[ep];
  const scene = script.scenes[sceneNum - 1];
  const prompt = buildVideoPrompt(scene);

  // Récupérer l'image de référence depuis la banque d'images
  let imageRef = null;
  const genImages = getBankImagesForEpisode(ep);
  if (genImages) {
    const img = genImages.find(g => g.sceneIndex === sceneNum - 1);
    if (img && img.url) {
      // Convertir l'URL en base64 pour Wan
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        imageRef = await blobToBase64(blob);
      } catch (e) {
        console.warn('Image de référence non chargeable, continuera sans', e);
      }
    }
  }

  // Lancer la prédiction Wan
  const predictionId = await replicateStartWan({
    prompt,
    imageRef,
    duration: 15,
  });

  // Polling avec progression
  const result = await replicatePoll(predictionId, (progress) => {
    const progressEl = document.getElementById(`clip-progress-${ep}-${sceneNum}`);
    if (progressEl) {
      progressEl.style.width = `${progress.percent}%`;
    }
  });

  // Extraire l'URL vidéo
  const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  // Sauvegarder dans IndexedDB
  try {
    const response = await fetch(videoUrl);
    const videoBlob = await response.blob();
    const arrayBuffer = await videoBlob.arrayBuffer();
    await dbSave(STORES.VIDEOS, {
      key: `ep${ep}-scene${sceneNum}`,
      ep,
      sceneNum,
      type: 'video/mp4',
      data: arrayBuffer,
    });
  } catch (e) {
    console.warn('Échec sauvegarde locale du clip, URL distante conservée', e);
  }

  // Mettre à jour l'état
  State.generatedClips[ep][sceneNum] = { status: 'generated', url: videoUrl };
  State.save();
  displayVideoClips(ep);
}

/**
 * Génère un placeholder Ken Burns (pas de Wan, image animée côté ffmpeg)
 * Stocke simplement la config pour l'assemblage ultérieur
 * @param {number} ep — numéro épisode
 * @param {number} sceneNum — numéro sous-scène
 */
async function generateKenBurnsClip(ep, sceneNum) {
  const animConfig = (State.animationConfig && State.animationConfig[ep]) || {};
  const config = animConfig[sceneNum] || { kbDirection: 'zoom-in' };

  // Récupérer l'image source (générée à l'écran 7)
  let imageUrl = null;
  const genImages = getBankImagesForEpisode(ep);
  if (genImages) {
    const img = genImages.find(g => g.sceneIndex === sceneNum - 1);
    if (img) imageUrl = img.url;
  }

  if (!imageUrl) {
    throw new Error(`Image de la scène ${sceneNum} non trouvée. Générez les images d'abord (écran 7).`);
  }

  // Ken Burns : pas de génération IA, l'effet sera appliqué par ffmpeg
  // On stocke la config + l'URL de l'image source
  State.generatedClips[ep][sceneNum] = {
    status: 'generated',
    url: imageUrl,       // URL de l'image (pas une vidéo)
    isKenBurns: true,
    kbDirection: config.kbDirection || 'zoom-in',
  };
  State.save();
  displayVideoClips(ep);
}

/**
 * Construit le prompt vidéo pour Wan 2.1
 * @param {Object} scene — données de la sous-scène
 * @returns {string}
 */
function buildVideoPrompt(scene) {
  const canonJSON = JSON.stringify(State.idIP || {}, null, 2);

  return `${scene.visualDescription || ''}

Camera: ${scene.cameraNote || 'plan moyen'}
Mood: ${scene.mood || ''}

ID IP (style et fidélité) :
${canonJSON}

Style: cinematic, high quality, smooth motion, 9:16 vertical format`;
}

/**
 * Approuve un clip vidéo
 * @param {number} ep — numéro épisode
 * @param {number} sceneNum — numéro sous-scène
 */
function approveClip(ep, sceneNum) {
  if (State.generatedClips[ep] && State.generatedClips[ep][sceneNum]) {
    State.generatedClips[ep][sceneNum].status = 'approved';
    State.save();
    renderVideoTabs();
    displayVideoClips(ep);
    checkScreen10Ready();
  }
}

/**
 * Régénère un clip vidéo
 * @param {number} ep — numéro épisode
 * @param {number} sceneNum — numéro sous-scène
 */
function regenerateClip(ep, sceneNum) {
  if (State.generatedClips[ep]) {
    delete State.generatedClips[ep][sceneNum];
    State.save();
  }
  generateClip(ep, sceneNum);
}

/**
 * Génère tous les clips non générés de l'épisode courant
 */
async function generateAllClips() {
  const ep = currentVideoEpisode;
  const script = State.scripts && State.scripts[ep];
  if (!script || !script.scenes) return;

  for (let i = 0; i < script.scenes.length; i++) {
    const sceneNum = script.scenes[i].sceneNumber || i + 1;
    const clip = State.generatedClips[ep] && State.generatedClips[ep][sceneNum];
    if (!clip || !clip.url) {
      await generateClip(ep, sceneNum);
    }
  }
}

/**
 * Auto-batch : génère les clips des épisodes 2-5 automatiquement
 */
async function startVideoAutoBatch() {
  showLoading('screen-10-loading', 'replicate', {
    message: 'Auto-batch — Génération des clips épisodes 2 à 5…',
  });

  for (let ep = 2; ep <= 5; ep++) {
    const script = State.scripts && State.scripts[ep];
    if (!script || !script.scenes) continue;

    updateLoadingCounter('screen-10-loading', ep - 1, 4);

    for (let i = 0; i < script.scenes.length; i++) {
      const sceneNum = script.scenes[i].sceneNumber || i + 1;
      const clip = State.generatedClips[ep] && State.generatedClips[ep][sceneNum];
      if (!clip || !clip.url) {
        if (!State.generatedClips[ep]) State.generatedClips[ep] = {};
        await generateClip(ep, sceneNum);
      }
    }

    // Auto-approve les clips batch
    if (State.generatedClips[ep]) {
      for (const sceneNum of Object.keys(State.generatedClips[ep])) {
        if (State.generatedClips[ep][sceneNum].status === 'generated') {
          State.generatedClips[ep][sceneNum].status = 'approved';
        }
      }
      State.save();
    }
  }

  hideLoading('screen-10-loading');
  renderVideoTabs();
  displayVideoClips(currentVideoEpisode);
}

/**
 * Vérifie si l'écran 10 est prêt (EP1 tous clips approuvés)
 */
function checkScreen10Ready() {
  const ep1Clips = State.generatedClips && State.generatedClips[1];
  const allApproved = ep1Clips && Object.keys(ep1Clips).length === 3 &&
    Object.values(ep1Clips).every(c => c.status === 'approved');

  const btn = document.getElementById('btn-next-screen10');
  if (btn) {
    btn.disabled = !allApproved;
  }
}
