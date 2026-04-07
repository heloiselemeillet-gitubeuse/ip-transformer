// webtoon-editor.js — Écran 13 : Éditeur webtoon avec bulles de dialogue
// 3 images empilées verticalement, bulles drag & drop, gouttières configurables

/**
 * Styles de bulles disponibles
 */
const BUBBLE_STYLES = [
  { id: 'round', label: 'Dialogue', icon: '💬', css: 'bubble--round' },
  { id: 'cloud', label: 'Pensée', icon: '💭', css: 'bubble--cloud' },
  { id: 'jagged', label: 'Cri', icon: '💥', css: 'bubble--jagged' },
  { id: 'rect', label: 'Narrateur', icon: '📦', css: 'bubble--rect' },
];

/** Épisode actuellement sélectionné dans l'éditeur webtoon */
let currentWebtoonEpisode = 1;

/** Bulle en cours de drag */
let draggingBubble = null;
let dragOffset = { x: 0, y: 0 };

/**
 * Initialise l'écran 13 — éditeur webtoon
 */
function initScreen13() {
  // Initialiser les données webtoon dans State si nécessaire
  if (!State.webtoonData) {
    State.webtoonData = {};
  }

  renderWebtoonTabs();
  selectWebtoonEpisode(1);

  // Initialiser le slider de gouttière
  const gutterSlider = document.getElementById('gutter-slider');
  if (gutterSlider) {
    gutterSlider.addEventListener('input', (e) => {
      updateGutterSize(parseInt(e.target.value));
    });
  }
}

/**
 * Affiche les onglets épisodes pour le webtoon
 */
function renderWebtoonTabs() {
  const tabsEl = document.getElementById('webtoon-tabs');
  if (!tabsEl) return;

  const episodes = State.episodes || [];
  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const hasData = State.webtoonData && State.webtoonData[num];
    return `
      <button class="episode-tab ${num === currentWebtoonEpisode ? 'episode-tab--active' : ''} ${hasData ? 'episode-tab--done' : ''}"
        onclick="selectWebtoonEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        <span class="episode-tab__title">${ep.title || ''}</span>
        ${hasData ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode et charge l'éditeur webtoon
 * @param {number} episodeNum — numéro de l'épisode (1-5)
 */
function selectWebtoonEpisode(episodeNum) {
  currentWebtoonEpisode = episodeNum;
  renderWebtoonTabs();
  loadWebtoonEditor(episodeNum);
}

/**
 * Charge l'éditeur webtoon pour un épisode
 * @param {number} episodeNum — numéro de l'épisode
 */
function loadWebtoonEditor(episodeNum) {
  const editor = document.getElementById('webtoon-editor');
  if (!editor) return;

  const script = State.scripts && State.scripts[episodeNum];
  const genImages = State.generatedImages && State.generatedImages[episodeNum];

  if (!script || !script.scenes) {
    editor.innerHTML = '<div class="card"><p class="status--error">Script de l\'épisode non trouvé.</p></div>';
    return;
  }

  if (!genImages || genImages.length < 3) {
    editor.innerHTML = '<div class="card"><p class="status--error">Images non générées. Retournez à l\'écran Génération.</p></div>';
    return;
  }

  // Charger ou initialiser les données webtoon pour cet épisode
  if (!State.webtoonData[episodeNum]) {
    State.webtoonData[episodeNum] = initWebtoonEpisodeData(episodeNum, script, genImages);
    State.save();
  }

  const data = State.webtoonData[episodeNum];
  renderWebtoonStrip(editor, data, episodeNum);
  updatePreview(episodeNum);
}

/**
 * Initialise les données webtoon pour un épisode (placement auto des bulles)
 * @param {number} episodeNum — numéro de l'épisode
 * @param {Object} script — script de l'épisode
 * @param {Array} genImages — images générées
 * @returns {Object} — données webtoon structurées
 */
function initWebtoonEpisodeData(episodeNum, script, genImages) {
  const gutterSize = State.webtoonGutter || 30;

  const panels = script.scenes.map((scene, i) => {
    const sceneNum = scene.sceneNumber || i + 1;
    const image = genImages.find(g => g.sceneIndex === i) || genImages[i];

    // Créer les bulles à partir des dialogues
    const bubbles = (scene.dialogue || []).slice(0, 4).map((d, bi) => {
      // Placement auto : bulles en bas de l'image pour ne pas masquer les visages
      const yPercent = 55 + (bi * 12); // démarrer à 55%, espacement 12%
      const xPercent = bi % 2 === 0 ? 5 : 50; // alternance gauche/droite

      // Couleur par intervenant (mode podcast)
      let color = '#ffffff';
      if (State.idIP && State.idIP.characters) {
        const char = State.idIP.characters.find(c =>
          c.name.toLowerCase() === d.speaker.toLowerCase()
        );
        if (char) color = char.color || '#ffffff';
      }

      return {
        id: `ep${episodeNum}-s${sceneNum}-b${bi}`,
        text: d.text,
        speaker: d.speaker,
        style: 'round',  // défaut : bulle dialogue
        x: xPercent,      // position en % de la largeur
        y: yPercent,       // position en % de la hauteur du panneau
        color,
        fontSize: 16,
      };
    });

    return {
      sceneNum,
      title: scene.title || `Scène ${sceneNum}`,
      imageUrl: image ? image.url : null,
      bubbles,
      gutterAfter: i < 2 ? gutterSize : 0, // gouttière après panneau 1 et 2
    };
  });

  return { panels, gutterSize };
}

/**
 * Affiche la bande webtoon (3 panneaux + bulles) dans l'éditeur
 * @param {HTMLElement} editor — conteneur de l'éditeur
 * @param {Object} data — données webtoon de l'épisode
 * @param {number} episodeNum — numéro de l'épisode
 */
function renderWebtoonStrip(editor, data, episodeNum) {
  editor.innerHTML = `
    <div class="wt-strip" id="wt-strip">
      ${data.panels.map((panel, pi) => `
        <div class="wt-panel" data-panel="${pi}" id="wt-panel-${pi}">
          <!-- Image du panneau -->
          <img class="wt-panel__img" src="${panel.imageUrl || ''}" alt="Scène ${panel.sceneNum}"
            onerror="this.style.background='#222'; this.alt='Image non disponible'">

          <!-- Bulles de dialogue -->
          ${panel.bubbles.map((bubble, bi) => `
            <div class="wt-bubble ${BUBBLE_STYLES.find(s => s.id === bubble.style)?.css || 'bubble--round'}"
              id="${bubble.id}"
              data-panel="${pi}" data-bubble="${bi}"
              style="left: ${bubble.x}%; top: ${bubble.y}%; color: #000; border-color: ${bubble.color}; font-size: ${bubble.fontSize}px;"
              onmousedown="startBubbleDrag(event, ${pi}, ${bi})"
              ontouchstart="startBubbleDrag(event, ${pi}, ${bi})">
              <span class="wt-bubble__speaker" style="color: ${bubble.color}">${bubble.speaker}</span>
              <span class="wt-bubble__text">${bubble.text}</span>
            </div>
          `).join('')}

          <!-- Bouton ajout bulle -->
          <button class="wt-panel__add-bubble" onclick="addBubble(${episodeNum}, ${pi})" title="Ajouter une bulle">+</button>
        </div>

        <!-- Gouttière -->
        ${pi < data.panels.length - 1 ? `
          <div class="wt-gutter" style="height: ${panel.gutterAfter || data.gutterSize}px"
            data-panel="${pi}">
            <button class="wt-gutter__btn wt-gutter__btn--small" onclick="setGutterType(${episodeNum}, ${pi}, 'normal')" title="Normal (20-40px)">─</button>
            <button class="wt-gutter__btn wt-gutter__btn--large" onclick="setGutterType(${episodeNum}, ${pi}, 'dramatic')" title="Pause dramatique (60-80px)">━</button>
          </div>
        ` : ''}
      `).join('')}
    </div>

    <!-- Barre d'outils bulles -->
    <div class="wt-toolbar" id="wt-toolbar" style="display: none;">
      <div class="wt-toolbar__section">
        <span class="wt-toolbar__label">Style :</span>
        ${BUBBLE_STYLES.map(s => `
          <button class="wt-toolbar__btn" onclick="setBubbleStyle('${s.id}')" title="${s.label}">
            ${s.icon}
          </button>
        `).join('')}
      </div>
      <div class="wt-toolbar__section">
        <button class="wt-toolbar__btn wt-toolbar__btn--delete" onclick="deleteSelectedBubble()" title="Supprimer">🗑️</button>
        <button class="wt-toolbar__btn" onclick="editBubbleText()" title="Modifier le texte">✏️</button>
      </div>
    </div>
  `;

  // Ajouter les listeners de drag globaux
  setupDragListeners();
}

/**
 * Configure les listeners globaux pour le drag & drop des bulles
 */
function setupDragListeners() {
  const strip = document.getElementById('wt-strip');
  if (!strip) return;

  // Mouse
  strip.addEventListener('mousemove', handleBubbleDrag);
  strip.addEventListener('mouseup', stopBubbleDrag);
  strip.addEventListener('mouseleave', stopBubbleDrag);

  // Touch
  strip.addEventListener('touchmove', handleBubbleDrag, { passive: false });
  strip.addEventListener('touchend', stopBubbleDrag);
}

/** Bulle et panneau actuellement sélectionnés */
let selectedPanel = null;
let selectedBubble = null;

/**
 * Démarre le drag d'une bulle
 * @param {Event} event — mousedown ou touchstart
 * @param {number} panelIdx — index du panneau
 * @param {number} bubbleIdx — index de la bulle
 */
function startBubbleDrag(event, panelIdx, bubbleIdx) {
  event.preventDefault();

  const bubbleEl = event.currentTarget;
  const panelEl = bubbleEl.closest('.wt-panel');
  const rect = panelEl.getBoundingClientRect();

  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  dragOffset.x = clientX - bubbleEl.getBoundingClientRect().left;
  dragOffset.y = clientY - bubbleEl.getBoundingClientRect().top;

  draggingBubble = { panelIdx, bubbleIdx, panelRect: rect };

  // Sélectionner la bulle
  selectBubble(panelIdx, bubbleIdx);

  bubbleEl.classList.add('wt-bubble--dragging');
}

/**
 * Gère le mouvement pendant le drag
 * @param {Event} event — mousemove ou touchmove
 */
function handleBubbleDrag(event) {
  if (!draggingBubble) return;
  event.preventDefault();

  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const { panelIdx, bubbleIdx, panelRect } = draggingBubble;
  const data = State.webtoonData[currentWebtoonEpisode];
  if (!data) return;

  // Calculer la nouvelle position en %
  const xPercent = Math.max(0, Math.min(85, ((clientX - dragOffset.x - panelRect.left) / panelRect.width) * 100));
  const yPercent = Math.max(0, Math.min(85, ((clientY - dragOffset.y - panelRect.top) / panelRect.height) * 100));

  // Mettre à jour visuellement
  const bubble = data.panels[panelIdx].bubbles[bubbleIdx];
  bubble.x = Math.round(xPercent);
  bubble.y = Math.round(yPercent);

  const bubbleEl = document.getElementById(bubble.id);
  if (bubbleEl) {
    bubbleEl.style.left = `${bubble.x}%`;
    bubbleEl.style.top = `${bubble.y}%`;
  }
}

/**
 * Arrête le drag d'une bulle
 */
function stopBubbleDrag() {
  if (!draggingBubble) return;

  const { panelIdx, bubbleIdx } = draggingBubble;
  const data = State.webtoonData[currentWebtoonEpisode];
  if (data) {
    const bubble = data.panels[panelIdx].bubbles[bubbleIdx];
    const bubbleEl = document.getElementById(bubble.id);
    if (bubbleEl) {
      bubbleEl.classList.remove('wt-bubble--dragging');
    }
  }

  draggingBubble = null;
  State.save();
  updatePreview(currentWebtoonEpisode);
}

/**
 * Sélectionne une bulle (affiche la toolbar)
 * @param {number} panelIdx — index du panneau
 * @param {number} bubbleIdx — index de la bulle
 */
function selectBubble(panelIdx, bubbleIdx) {
  // Désélectionner l'ancienne
  document.querySelectorAll('.wt-bubble--selected').forEach(el => {
    el.classList.remove('wt-bubble--selected');
  });

  selectedPanel = panelIdx;
  selectedBubble = bubbleIdx;

  const data = State.webtoonData[currentWebtoonEpisode];
  if (!data) return;

  const bubble = data.panels[panelIdx].bubbles[bubbleIdx];
  const bubbleEl = document.getElementById(bubble.id);
  if (bubbleEl) {
    bubbleEl.classList.add('wt-bubble--selected');
  }

  // Afficher la toolbar
  const toolbar = document.getElementById('wt-toolbar');
  if (toolbar) toolbar.style.display = 'flex';
}

/**
 * Change le style de la bulle sélectionnée
 * @param {string} styleId — id du style ('round', 'cloud', 'jagged', 'rect')
 */
function setBubbleStyle(styleId) {
  if (selectedPanel === null || selectedBubble === null) return;

  const data = State.webtoonData[currentWebtoonEpisode];
  if (!data) return;

  data.panels[selectedPanel].bubbles[selectedBubble].style = styleId;
  State.save();

  // Re-render
  loadWebtoonEditor(currentWebtoonEpisode);
}

/**
 * Supprime la bulle sélectionnée
 */
function deleteSelectedBubble() {
  if (selectedPanel === null || selectedBubble === null) return;

  const data = State.webtoonData[currentWebtoonEpisode];
  if (!data) return;

  data.panels[selectedPanel].bubbles.splice(selectedBubble, 1);
  selectedPanel = null;
  selectedBubble = null;
  State.save();

  loadWebtoonEditor(currentWebtoonEpisode);
}

/**
 * Édite le texte de la bulle sélectionnée
 */
function editBubbleText() {
  if (selectedPanel === null || selectedBubble === null) return;

  const data = State.webtoonData[currentWebtoonEpisode];
  if (!data) return;

  const bubble = data.panels[selectedPanel].bubbles[selectedBubble];
  const newText = prompt('Texte de la bulle :', bubble.text);
  if (newText !== null) {
    bubble.text = newText;
    State.save();
    loadWebtoonEditor(currentWebtoonEpisode);
  }
}

/**
 * Ajoute une nouvelle bulle à un panneau
 * @param {number} episodeNum — numéro de l'épisode
 * @param {number} panelIdx — index du panneau
 */
function addBubble(episodeNum, panelIdx) {
  const data = State.webtoonData[episodeNum];
  if (!data) return;

  const panel = data.panels[panelIdx];
  if (panel.bubbles.length >= 4) {
    alert('Maximum 4 bulles par panneau.');
    return;
  }

  const bubbleCount = panel.bubbles.length;
  panel.bubbles.push({
    id: `ep${episodeNum}-s${panel.sceneNum}-b${bubbleCount}`,
    text: 'Nouveau texte…',
    speaker: '',
    style: 'round',
    x: 10 + (bubbleCount * 20),
    y: 10 + (bubbleCount * 20),
    color: '#ffffff',
    fontSize: 16,
  });

  State.save();
  loadWebtoonEditor(episodeNum);
}

/**
 * Définit le type de gouttière entre deux panneaux
 * @param {number} episodeNum — numéro de l'épisode
 * @param {number} panelIdx — index du panneau (gouttière après ce panneau)
 * @param {string} type — 'normal' (20-40px) ou 'dramatic' (60-80px)
 */
function setGutterType(episodeNum, panelIdx, type) {
  const data = State.webtoonData[episodeNum];
  if (!data) return;

  data.panels[panelIdx].gutterAfter = type === 'dramatic' ? 70 : 30;
  State.save();

  loadWebtoonEditor(episodeNum);
}

/**
 * Met à jour la taille globale des gouttières
 * @param {number} size — taille en pixels
 */
function updateGutterSize(size) {
  State.webtoonGutter = size;

  const label = document.getElementById('gutter-value');
  if (label) label.textContent = `${size}px`;

  // Mettre à jour les gouttières non modifiées individuellement
  const data = State.webtoonData[currentWebtoonEpisode];
  if (data) {
    data.gutterSize = size;
    State.save();
  }
}

/**
 * Met à jour la preview mobile (360px)
 * @param {number} episodeNum — numéro de l'épisode
 */
function updatePreview(episodeNum) {
  const preview = document.getElementById('wt-preview');
  if (!preview) return;

  const data = State.webtoonData[episodeNum];
  if (!data) {
    preview.innerHTML = '<p class="status--error">Aucune donnée.</p>';
    return;
  }

  // Clone simplifié de la bande pour la preview (échelle réduite)
  preview.innerHTML = `
    <div class="wt-preview-strip">
      ${data.panels.map((panel, pi) => `
        <div class="wt-preview-panel">
          <img src="${panel.imageUrl || ''}" alt="S${panel.sceneNum}">
          ${panel.bubbles.map(b => `
            <div class="wt-preview-bubble ${BUBBLE_STYLES.find(s => s.id === b.style)?.css || ''}"
              style="left:${b.x}%; top:${b.y}%; font-size:12px; border-color:${b.color}">
              <span class="wt-preview-bubble__text">${b.text.substring(0, 40)}${b.text.length > 40 ? '…' : ''}</span>
            </div>
          `).join('')}
        </div>
        ${pi < data.panels.length - 1 ? `<div class="wt-preview-gutter" style="height:${Math.round((panel.gutterAfter || 30) * 0.5)}px"></div>` : ''}
      `).join('')}
    </div>
  `;
}
