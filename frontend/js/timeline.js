// timeline.js — Écran 11 : Interface timeline visuelle
// Affiche les 3 clips + transitions + musique d'un épisode
// Permet de lancer l'assemblage ffmpeg.wasm

/** Épisode actuellement sélectionné dans la timeline */
let currentTimelineEpisode = 1;

/** Blob de la vidéo assemblée par épisode */
const assembledVideos = {};

/**
 * Initialise l'écran 11 — timeline + assemblage
 */
function initScreen11() {
  renderTimelineTabs();
  selectTimelineEpisode(1);

  // Vérifier le support ffmpeg
  if (!isFFmpegSupported()) {
    const warning = document.getElementById('ffmpeg-warning');
    if (warning) {
      warning.style.display = 'block';
      warning.innerHTML = `
        <div class="card card--warning">
          <h3>⚠️ Desktop uniquement</h3>
          <p>L'assemblage vidéo nécessite un navigateur desktop avec SharedArrayBuffer.
          Utilisez Chrome ou Firefox sur ordinateur.</p>
        </div>
      `;
    }
  }
}

/**
 * Affiche les onglets épisodes pour la timeline
 */
function renderTimelineTabs() {
  const tabsEl = document.getElementById('timeline-tabs');
  if (!tabsEl) return;

  const episodes = State.episodes || [];
  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const hasVideo = !!assembledVideos[num];
    return `
      <button class="episode-tab ${num === currentTimelineEpisode ? 'episode-tab--active' : ''} ${hasVideo ? 'episode-tab--done' : ''}"
        onclick="selectTimelineEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        <span class="episode-tab__title">${ep.title || ''}</span>
        ${hasVideo ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode dans la timeline
 * @param {number} episodeNum — numéro de l'épisode
 */
function selectTimelineEpisode(episodeNum) {
  currentTimelineEpisode = episodeNum;
  renderTimelineTabs();
  displayTimeline(episodeNum);
}

/**
 * Affiche la timeline visuelle d'un épisode
 * @param {number} episodeNum — numéro de l'épisode
 */
function displayTimeline(episodeNum) {
  const container = document.getElementById('timeline-content');
  if (!container) return;

  const script = State.scripts && State.scripts[episodeNum];
  const clips = State.generatedClips && State.generatedClips[episodeNum];
  const animConfig = State.animationConfig && State.animationConfig[episodeNum];
  const musicTrack = getMusicTrack(State.selectedMusic);

  if (!script || !script.scenes) {
    container.innerHTML = '<div class="card"><p class="status--error">Données manquantes pour cet épisode.</p></div>';
    return;
  }

  // Construire la timeline visuelle
  container.innerHTML = `
    <!-- Piste vidéo -->
    <div class="timeline">
      <div class="timeline__track timeline__track--video">
        <span class="timeline__track-label">Vidéo</span>
        <div class="timeline__segments">
          ${script.scenes.map((scene, i) => {
            const sceneNum = scene.sceneNumber || i + 1;
            const clip = clips && clips[sceneNum];
            const config = animConfig && animConfig[sceneNum];
            const typeLabel = config && config.type === 'kenburns' ? 'KB' : 'Wan';
            const statusClass = clip && clip.status === 'approved' ? 'timeline__segment--ok' :
                               clip && clip.url ? 'timeline__segment--pending' : 'timeline__segment--empty';

            return `
              <div class="timeline__segment ${statusClass}" title="Scène ${sceneNum} — ${typeLabel}">
                <span class="timeline__segment-label">${scene.title || `S${sceneNum}`}</span>
                <span class="timeline__segment-type">${typeLabel}</span>
                <span class="timeline__segment-dur">~15s</span>
              </div>
              ${i < script.scenes.length - 1 ? '<div class="timeline__transition" title="Transition xfade 1s">✕</div>' : ''}
            `;
          }).join('')}
        </div>
      </div>

      <!-- Piste musique -->
      <div class="timeline__track timeline__track--music">
        <span class="timeline__track-label">Musique</span>
        <div class="timeline__segments">
          <div class="timeline__segment timeline__segment--music ${musicTrack ? 'timeline__segment--ok' : 'timeline__segment--empty'}">
            <span class="timeline__segment-label">${musicTrack ? musicTrack.label : 'Aucune musique'}</span>
            <span class="timeline__segment-dur">~45s + fade out</span>
          </div>
        </div>
      </div>

      <!-- Barre de temps -->
      <div class="timeline__timebar">
        <span>0s</span>
        <span>15s</span>
        <span>30s</span>
        <span>45s</span>
      </div>
    </div>

    <!-- Résumé -->
    <div class="card timeline-summary">
      <div class="timeline-summary__row">
        <span>Durée estimée</span>
        <strong>~43 secondes</strong>
      </div>
      <div class="timeline-summary__row">
        <span>Transitions</span>
        <strong>2 × xfade (1s)</strong>
      </div>
      <div class="timeline-summary__row">
        <span>Musique</span>
        <strong>${musicTrack ? musicTrack.label + ' — ' + musicTrack.mood : 'Non sélectionnée'}</strong>
      </div>
      <div class="timeline-summary__row">
        <span>Format</span>
        <strong>9:16 vertical (720×1280)</strong>
      </div>
    </div>

    <!-- Prévisualisation de la vidéo assemblée -->
    ${assembledVideos[episodeNum] ? `
      <div class="card">
        <h3 class="card__title">Vidéo assemblée — Épisode ${episodeNum}</h3>
        <video class="timeline-preview-video" src="${URL.createObjectURL(assembledVideos[episodeNum])}" controls></video>
      </div>
    ` : ''}
  `;
}

/**
 * Lance l'assemblage de l'épisode courant via ffmpeg.wasm
 */
async function assembleCurrentEpisode() {
  const ep = currentTimelineEpisode;

  if (!isFFmpegSupported()) {
    alert('L\'assemblage vidéo nécessite un navigateur desktop (Chrome ou Firefox).');
    return;
  }

  showLoading('screen-11-loading', 'ffmpeg', {
    message: `Assemblage de l'épisode ${ep}…`,
  });

  try {
    const videoBlob = await assembleFullEpisode({
      episodeNum: ep,
      onProgress: ({ step, percent, message }) => {
        updateLoadingProgress('screen-11-loading', percent);
        // Mettre à jour le message contextuel
        const msgEl = document.querySelector('#screen-11-loading .loading__message');
        if (msgEl) msgEl.textContent = message;
      },
    });

    // Stocker le résultat
    assembledVideos[ep] = videoBlob;

    // Sauvegarder dans IndexedDB
    const arrayBuffer = await videoBlob.arrayBuffer();
    await dbSave(STORES.VIDEOS, {
      key: `assembled-ep${ep}`,
      ep,
      type: 'video/mp4',
      data: arrayBuffer,
      assembled: true,
    });

    hideLoading('screen-11-loading');
    renderTimelineTabs();
    displayTimeline(ep);
    checkScreen11Ready();

  } catch (err) {
    hideLoading('screen-11-loading');
    alert(`Erreur d'assemblage : ${err.message}`);
    console.error('Erreur assemblage :', err);
  }
}

/**
 * Assemble tous les épisodes automatiquement (batch)
 */
async function assembleAllEpisodes() {
  for (let ep = 1; ep <= 5; ep++) {
    if (!assembledVideos[ep]) {
      currentTimelineEpisode = ep;
      renderTimelineTabs();
      await assembleCurrentEpisode();
    }
  }
}

/**
 * Vérifie si l'écran 11 est prêt (au moins EP1 assemblé)
 */
function checkScreen11Ready() {
  const btn = document.getElementById('btn-next-screen11');
  if (btn) {
    btn.disabled = !assembledVideos[1];
  }
}
