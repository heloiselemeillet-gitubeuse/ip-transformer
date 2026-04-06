// export.js — Écran 12 : Export vidéo final
// Preview 9:16 dans cadre phone, download MP4, option 16:9

/** Épisode actuellement sélectionné pour l'export */
let currentExportEpisode = 1;

/**
 * Initialise l'écran 12 — export vidéo
 */
function initScreen12() {
  renderExportTabs();
  selectExportEpisode(1);
}

/**
 * Affiche les onglets épisodes pour l'export
 */
function renderExportTabs() {
  const tabsEl = document.getElementById('export-tabs');
  if (!tabsEl) return;

  const episodes = State.episodes || [];
  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const hasVideo = !!assembledVideos[num];
    return `
      <button class="episode-tab ${num === currentExportEpisode ? 'episode-tab--active' : ''} ${hasVideo ? 'episode-tab--done' : ''}"
        onclick="selectExportEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        <span class="episode-tab__title">${ep.title || ''}</span>
        ${hasVideo ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode pour l'export
 * @param {number} episodeNum — numéro de l'épisode
 */
function selectExportEpisode(episodeNum) {
  currentExportEpisode = episodeNum;
  renderExportTabs();
  displayExport(episodeNum);
}

/**
 * Affiche la prévisualisation et les options d'export
 * @param {number} episodeNum — numéro de l'épisode
 */
function displayExport(episodeNum) {
  const container = document.getElementById('export-content');
  if (!container) return;

  const videoBlob = assembledVideos[episodeNum];
  const episode = getEpisodeData(episodeNum);

  if (!videoBlob) {
    container.innerHTML = `
      <div class="card">
        <p class="status--error">Vidéo de l'épisode ${episodeNum} non assemblée.
        Retournez à l'écran Assemblage.</p>
      </div>
    `;
    return;
  }

  const videoUrl = URL.createObjectURL(videoBlob);
  const sizeMB = (videoBlob.size / (1024 * 1024)).toFixed(1);

  container.innerHTML = `
    <!-- Cadre phone 9:16 -->
    <div class="phone-frame">
      <div class="phone-frame__notch"></div>
      <div class="phone-frame__screen">
        <video class="phone-frame__video" src="${videoUrl}" controls playsinline></video>
      </div>
      <div class="phone-frame__bar"></div>
    </div>

    <!-- Métadonnées -->
    <div class="card export-meta">
      <h3 class="card__title">Épisode ${episodeNum}${episode ? ' — ' + episode.title : ''}</h3>
      <div class="export-meta__grid">
        <div class="export-meta__item">
          <span class="export-meta__label">Format</span>
          <span class="export-meta__value">9:16 vertical</span>
        </div>
        <div class="export-meta__item">
          <span class="export-meta__label">Résolution</span>
          <span class="export-meta__value">720 × 1280</span>
        </div>
        <div class="export-meta__item">
          <span class="export-meta__label">Durée</span>
          <span class="export-meta__value">~43s</span>
        </div>
        <div class="export-meta__item">
          <span class="export-meta__label">Taille</span>
          <span class="export-meta__value">${sizeMB} Mo</span>
        </div>
        <div class="export-meta__item">
          <span class="export-meta__label">Musique</span>
          <span class="export-meta__value">${getMusicTrack(State.selectedMusic)?.label || 'Aucune'}</span>
        </div>
        <div class="export-meta__item">
          <span class="export-meta__label">Codec</span>
          <span class="export-meta__value">H.264 / AAC</span>
        </div>
      </div>
    </div>

    <!-- Actions d'export -->
    <div class="export-actions">
      <button class="btn btn--primary btn--large" onclick="downloadEpisode(${episodeNum}, '9:16')">
        Télécharger MP4 (9:16)
      </button>
      <button class="btn btn--secondary" onclick="downloadEpisode(${episodeNum}, '16:9')">
        Exporter en 16:9 (paysage)
      </button>
      <button class="btn btn--secondary" onclick="downloadAllEpisodes()">
        Télécharger tous les épisodes
      </button>
    </div>
  `;
}

/**
 * Récupère les données d'un épisode par son numéro
 * @param {number} episodeNum — numéro de l'épisode
 * @returns {Object|null}
 */
function getEpisodeData(episodeNum) {
  const episodes = State.episodes || [];
  if (Array.isArray(episodes)) {
    return episodes.find(e => (e.number || 0) === episodeNum) || episodes[episodeNum - 1] || null;
  }
  return null;
}

/**
 * Télécharge la vidéo d'un épisode
 * @param {number} episodeNum — numéro de l'épisode
 * @param {string} format — '9:16' ou '16:9'
 */
async function downloadEpisode(episodeNum, format) {
  let videoBlob = assembledVideos[episodeNum];
  if (!videoBlob) {
    alert('Vidéo non trouvée. Assemblez d\'abord l\'épisode.');
    return;
  }

  // Si 16:9 demandé, recadrer via ffmpeg
  if (format === '16:9') {
    try {
      showLoading('screen-12-loading', 'ffmpeg', {
        message: 'Conversion en 16:9…',
      });

      videoBlob = await convertTo16x9(videoBlob);

      hideLoading('screen-12-loading');
    } catch (err) {
      hideLoading('screen-12-loading');
      alert(`Erreur de conversion : ${err.message}`);
      return;
    }
  }

  // Construire le nom du fichier
  const episode = getEpisodeData(episodeNum);
  const title = episode ? episode.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, '').replace(/\s+/g, '-') : '';
  const fileName = `ip-transformer-ep${episodeNum}${title ? '-' + title : ''}-${format.replace(':', 'x')}.mp4`;

  // Télécharger
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convertit une vidéo 9:16 en 16:9 via ffmpeg (pillarbox ou crop+scale)
 * @param {Blob} videoBlob — vidéo source 9:16
 * @returns {Promise<Blob>} — vidéo 16:9
 */
async function convertTo16x9(videoBlob) {
  const ffmpeg = await loadFFmpeg();
  const fetchFile = ffmpeg._fetchFile;

  await ffmpeg.writeFile('input916.mp4', await fetchFile(videoBlob));

  // Stratégie : pillarbox (bandes noires sur les côtés)
  await ffmpeg.exec([
    '-i', 'input916.mp4',
    '-vf', 'pad=1280:720:(1280-iw)/2:(720-ih)/2:black,scale=1280:720',
    '-c:v', 'libx264',
    '-c:a', 'copy',
    '-pix_fmt', 'yuv420p',
    '-y', 'output169.mp4',
  ]);

  const data = await ffmpeg.readFile('output169.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Télécharge tous les épisodes assemblés en séquence
 */
async function downloadAllEpisodes() {
  for (let ep = 1; ep <= 5; ep++) {
    if (assembledVideos[ep]) {
      await downloadEpisode(ep, '9:16');
      // Petit délai pour éviter que le navigateur bloque les téléchargements multiples
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
