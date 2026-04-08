// animation.js — Écran 9 : Configuration animation par sous-scène
// Choix Wan (IA vidéo) vs Ken Burns (zoom/pan sur image fixe)
// Sélecteur de musique d'ambiance + estimation du coût

/**
 * Types d'animation disponibles par sous-scène
 */
const ANIMATION_TYPES = [
  {
    id: 'wan',
    label: 'Wan 2.1 (IA)',
    desc: 'Clip vidéo généré par IA — mouvements naturels, ~2-5 min de génération',
    cost: 1,   // unité relative de coût Replicate
    icon: '🎬',
  },
  {
    id: 'kenburns',
    label: 'Ken Burns',
    desc: 'Zoom/pan sur l\'image fixe — instantané, gratuit',
    cost: 0,
    icon: '🖼️',
  },
];

/**
 * Directions Ken Burns possibles
 */
const KENBURNS_DIRECTIONS = [
  { id: 'zoom-in', label: 'Zoom avant' },
  { id: 'zoom-out', label: 'Zoom arrière' },
  { id: 'pan-left', label: 'Pan gauche' },
  { id: 'pan-right', label: 'Pan droite' },
  { id: 'pan-up', label: 'Pan haut' },
  { id: 'pan-down', label: 'Pan bas' },
];

/** Épisode actuellement sélectionné pour la config animation */
let currentAnimEpisode = 1;

/**
 * Initialise l'écran 9 — config animation + musique
 */
function initScreen9() {
  // Initialiser la config animation dans State si nécessaire
  if (!State.animationConfig) {
    State.animationConfig = {};
  }
  if (!State.selectedMusic) {
    State.selectedMusic = null;
  }

  renderAnimTabs();
  selectAnimEpisode(1);

  // Afficher le sélecteur de musique
  renderMusicSelector('music-selector', State.selectedMusic, (trackId) => {
    State.selectedMusic = trackId;
    State.save();
    updateCostEstimate();
    checkScreen9Ready();
  });

  // Mettre à jour l'estimation de coût
  updateCostEstimate();
  checkScreen9Ready();
}

/**
 * Affiche les onglets épisodes pour la config animation
 */
function renderAnimTabs() {
  const tabsEl = document.getElementById('anim-tabs');
  if (!tabsEl) return;

  const episodes = State.episodes || [];
  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const hasConfig = State.animationConfig && State.animationConfig[num];
    return `
      <button class="episode-tab ${num === currentAnimEpisode ? 'episode-tab--active' : ''} ${hasConfig ? 'episode-tab--done' : ''}"
        onclick="selectAnimEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        <span class="episode-tab__title">${ep.title || ''}</span>
        ${hasConfig ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode et affiche sa config animation
 * @param {number} episodeNum — numéro de l'épisode (1-5)
 */
function selectAnimEpisode(episodeNum) {
  currentAnimEpisode = episodeNum;
  renderAnimTabs();
  displayAnimConfig(episodeNum);
}

/**
 * Affiche la config animation pour un épisode donné
 * @param {number} episodeNum — numéro de l'épisode
 */
function displayAnimConfig(episodeNum) {
  const container = document.getElementById('anim-scenes-config');
  if (!container) return;

  // Récupérer le script de l'épisode
  const script = State.scripts && State.scripts[episodeNum];
  if (!script || !script.scenes) {
    container.innerHTML = '<div class="card"><p class="status--error">Script de l\'épisode non trouvé. Revenez à l\'écran Scripts.</p></div>';
    return;
  }

  // Récupérer la config existante ou initialiser
  const config = (State.animationConfig && State.animationConfig[episodeNum]) || {};

  container.innerHTML = script.scenes.map((scene, i) => {
    const sceneNum = scene.sceneNumber || i + 1;
    const sceneConfig = config[sceneNum] || { type: 'wan', kbDirection: 'zoom-in' };

    return `
      <div class="anim-scene-card" data-scene="${sceneNum}">
        <div class="anim-scene-card__header">
          <span class="scene-card__number">Scène ${sceneNum}</span>
          <h4 class="scene-card__title">${scene.title || ''}</h4>
        </div>

        <p class="anim-scene-card__desc">${(scene.visualDescription || '').substring(0, 120)}…</p>

        <!-- Choix du type d'animation -->
        <div class="anim-type-choices">
          ${ANIMATION_TYPES.map(type => `
            <button class="anim-type-btn ${sceneConfig.type === type.id ? 'anim-type-btn--selected' : ''}"
              onclick="setAnimType(${episodeNum}, ${sceneNum}, '${type.id}')">
              <span class="anim-type-btn__icon">${type.icon}</span>
              <span class="anim-type-btn__label">${type.label}</span>
              <span class="anim-type-btn__desc">${type.desc}</span>
            </button>
          `).join('')}
        </div>

        <!-- Options Ken Burns (visible seulement si kenburns sélectionné) -->
        <div class="kb-options" style="display: ${sceneConfig.type === 'kenburns' ? 'block' : 'none'};" id="kb-options-${episodeNum}-${sceneNum}">
          <h5 class="kb-options__title">Direction du mouvement</h5>
          <div class="kb-direction-btns">
            ${KENBURNS_DIRECTIONS.map(dir => `
              <button class="kb-dir-btn ${sceneConfig.kbDirection === dir.id ? 'kb-dir-btn--selected' : ''}"
                onclick="setKBDirection(${episodeNum}, ${sceneNum}, '${dir.id}')">
                ${dir.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateCostEstimate();
}

/**
 * Définit le type d'animation pour une sous-scène
 * @param {number} ep — numéro épisode
 * @param {number} scene — numéro sous-scène
 * @param {string} type — 'wan' ou 'kenburns'
 */
function setAnimType(ep, scene, type) {
  if (!State.animationConfig) State.animationConfig = {};
  if (!State.animationConfig[ep]) State.animationConfig[ep] = {};
  if (!State.animationConfig[ep][scene]) State.animationConfig[ep][scene] = {};

  State.animationConfig[ep][scene].type = type;

  // Garder la direction Ken Burns existante ou défaut
  if (type === 'kenburns' && !State.animationConfig[ep][scene].kbDirection) {
    State.animationConfig[ep][scene].kbDirection = 'zoom-in';
  }

  State.save();

  // Re-render la config
  displayAnimConfig(ep);
  checkScreen9Ready();
}

/**
 * Définit la direction Ken Burns pour une sous-scène
 * @param {number} ep — numéro épisode
 * @param {number} scene — numéro sous-scène
 * @param {string} direction — id de la direction
 */
function setKBDirection(ep, scene, direction) {
  if (!State.animationConfig) State.animationConfig = {};
  if (!State.animationConfig[ep]) State.animationConfig[ep] = {};
  if (!State.animationConfig[ep][scene]) State.animationConfig[ep][scene] = {};

  State.animationConfig[ep][scene].kbDirection = direction;
  State.save();

  displayAnimConfig(ep);
}

/**
 * Met à jour l'estimation de coût affichée
 */
function updateCostEstimate() {
  const costEl = document.getElementById('cost-estimate');
  if (!costEl) return;

  let wanCount = 0;
  let kbCount = 0;

  const config = State.animationConfig || {};
  for (const ep of Object.values(config)) {
    for (const scene of Object.values(ep)) {
      if (scene.type === 'wan') wanCount++;
      else kbCount++;
    }
  }

  // Total théorique : 5 épisodes × 3 scènes = 15 clips
  const totalScenes = 15;
  const configuredScenes = wanCount + kbCount;
  const unconfigured = totalScenes - configuredScenes;

  // Estimation : Wan ~$0.10-0.30 par clip, Ken Burns = gratuit
  const estimatedCost = (wanCount * 0.20).toFixed(2);
  const estimatedTime = wanCount * 3; // ~3 min par clip Wan

  costEl.innerHTML = `
    <div class="cost-summary">
      <div class="cost-item">
        <span class="cost-item__label">Clips Wan (IA)</span>
        <span class="cost-item__value">${wanCount}</span>
      </div>
      <div class="cost-item">
        <span class="cost-item__label">Clips Ken Burns</span>
        <span class="cost-item__value">${kbCount}</span>
      </div>
      ${unconfigured > 0 ? `
        <div class="cost-item cost-item--muted">
          <span class="cost-item__label">Non configurés</span>
          <span class="cost-item__value">${unconfigured}</span>
        </div>
      ` : ''}
      <div class="cost-divider"></div>
      <div class="cost-item cost-item--total">
        <span class="cost-item__label">Coût estimé</span>
        <span class="cost-item__value">~$${estimatedCost}</span>
      </div>
      <div class="cost-item cost-item--total">
        <span class="cost-item__label">Temps estimé</span>
        <span class="cost-item__value">~${estimatedTime} min</span>
      </div>
    </div>
  `;
}

/**
 * Applique la config de l'épisode 1 à tous les épisodes 2-5
 */
function applyConfigToAll() {
  const config1 = State.animationConfig && State.animationConfig[1];
  if (!config1) return;

  for (let ep = 2; ep <= 5; ep++) {
    State.animationConfig[ep] = JSON.parse(JSON.stringify(config1));
  }
  State.save();

  renderAnimTabs();
  displayAnimConfig(currentAnimEpisode);
  updateCostEstimate();
  checkScreen9Ready();
}

/**
 * Vérifie si l'écran 9 est prêt
 * Condition : au moins 1 scène configurée (musique optionnelle pour le POC)
 */
function checkScreen9Ready() {
  const config = State.animationConfig || {};
  const hasAnyConfig = Object.keys(config).some(ep => Object.keys(config[ep]).length > 0);

  const btn = document.getElementById('btn-next-screen9');
  if (btn) {
    btn.disabled = !hasAnyConfig;
  }
}
