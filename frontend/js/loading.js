// loading.js — Composants de feedback d'attente
// Ne JAMAIS laisser l'écran figé (cf. CLAUDE.md)

/**
 * Types de chargement avec leurs configurations
 * Chaque type a un message par défaut et une durée estimée
 */
const LOADING_TYPES = {
  claude: {
    label: 'Analyse IA en cours…',
    estimate: '~20 secondes',
    style: 'spinner',     // Spinner + message + skeleton
  },
  replicate: {
    label: 'Génération en cours…',
    estimate: '1 à 5 minutes',
    style: 'progress',    // Barre de progression + statut + compteur
  },
  youtube: {
    label: 'Extraction du transcript…',
    estimate: '~15 secondes',
    style: 'spinner',
  },
  ffmpeg: {
    label: 'Assemblage vidéo…',
    estimate: '~1 minute',
    style: 'progress',    // Barre de progression avec % réel
  },
};

/**
 * Affiche un indicateur de chargement dans un conteneur
 * @param {string} containerId — id de l'élément conteneur
 * @param {string} type — type de chargement ('claude', 'replicate', 'youtube', 'ffmpeg')
 * @param {Object} options — options supplémentaires
 * @param {string} options.message — message personnalisé (remplace le défaut)
 * @param {number} options.total — nombre total d'éléments (pour replicate)
 * @param {number} options.current — numéro de l'élément en cours
 */
function showLoading(containerId, type, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const config = LOADING_TYPES[type] || LOADING_TYPES.claude;
  const message = options.message || config.label;
  const estimate = config.estimate;

  let html = '';

  if (config.style === 'spinner') {
    // Spinner avec message et estimation
    html = `
      <div class="loading loading--spinner" id="loading-${containerId}">
        <div class="loading__spinner"></div>
        <p class="loading__message">${message}</p>
        <p class="loading__estimate">${estimate}</p>
        <div class="loading__skeleton">
          <div class="loading__skeleton-line"></div>
          <div class="loading__skeleton-line loading__skeleton-line--short"></div>
          <div class="loading__skeleton-line loading__skeleton-line--medium"></div>
        </div>
      </div>
    `;
  } else if (config.style === 'progress') {
    // Barre de progression avec statut et compteur
    const counterHtml = options.total
      ? `<p class="loading__counter">Élément ${options.current || 1} / ${options.total}</p>`
      : '';

    html = `
      <div class="loading loading--progress" id="loading-${containerId}">
        <div class="loading__progress-bar">
          <div class="loading__progress-fill" style="width: 0%"></div>
        </div>
        <p class="loading__message">${message}</p>
        <p class="loading__estimate">${estimate}</p>
        ${counterHtml}
        <p class="loading__status">Démarrage…</p>
      </div>
    `;
  }

  container.innerHTML = html;
  container.style.display = 'block';
}

/**
 * Met à jour la progression d'un indicateur de type 'progress'
 * @param {string} containerId — id du conteneur
 * @param {number} percent — pourcentage de progression (0-100)
 * @param {string} status — message de statut optionnel
 */
function updateLoadingProgress(containerId, percent, status) {
  const loading = document.getElementById(`loading-${containerId}`);
  if (!loading) return;

  const fill = loading.querySelector('.loading__progress-fill');
  if (fill) {
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  if (status) {
    const statusEl = loading.querySelector('.loading__status');
    if (statusEl) {
      statusEl.textContent = status;
    }
  }
}

/**
 * Met à jour le compteur d'éléments (ex: "Image 3 / 5")
 * @param {string} containerId — id du conteneur
 * @param {number} current — numéro de l'élément en cours
 * @param {number} total — nombre total d'éléments
 */
function updateLoadingCounter(containerId, current, total) {
  const loading = document.getElementById(`loading-${containerId}`);
  if (!loading) return;

  const counter = loading.querySelector('.loading__counter');
  if (counter) {
    counter.textContent = `Élément ${current} / ${total}`;
  }
}

/**
 * Masque et supprime l'indicateur de chargement
 * @param {string} containerId — id du conteneur
 */
function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Animation de sortie
  const loading = container.querySelector('.loading');
  if (loading) {
    loading.classList.add('loading--hiding');
    setTimeout(() => {
      container.innerHTML = '';
      container.style.display = '';
    }, 300);
  } else {
    container.innerHTML = '';
    container.style.display = '';
  }
}
