// visuals.js — Écran 6 : Choix du style visuel + palette
// Génère 4 images test via Flux Redux pour comparer les styles

/**
 * Styles visuels disponibles selon le mode
 */
const VISUAL_STYLES = {
  podcast: [
    { id: 'manga', label: 'Manga', icon: '⚡', desc: 'Cel-shaded, couleurs vibrantes, compositions dynamiques', prompt: 'manga style, cel-shaded, vibrant colors, dynamic composition' },
    { id: 'realistic', label: 'Réaliste', icon: '📷', desc: 'Photoréaliste, éclairage cinématique, haute qualité', prompt: 'photorealistic, detailed, cinematic lighting, high quality' },
    { id: 'cartoon', label: 'Cartoon', icon: '🎨', desc: 'Traits gras, aplats de couleurs, style ludique', prompt: 'cartoon style, bold outlines, flat colors, playful' },
    { id: 'manhwa', label: 'Manhwa', icon: '✨', desc: 'Esthétique webtoon coréen, ombrage doux, élégant', prompt: 'manhwa style, korean webtoon aesthetic, soft shading, elegant' },
  ],
  peinture: [
    { id: 'faithful', label: 'Fidèle à l\'artiste', icon: '🖼️', desc: 'Technique et palette fidèles à l\'original', prompt: 'faithful to the original art style, same technique and palette' },
    { id: 'anime', label: 'Anime', icon: '⚡', desc: 'Adaptation animée, palette d\'origine conservée', prompt: 'anime adaptation, cel-shaded, maintaining original color palette' },
    { id: 'stylized', label: 'Réaliste stylisé', icon: '🎭', desc: 'Réalisme pictural, détaillé, artistique', prompt: 'stylized realism, painterly, detailed, artistic' },
    { id: 'expressionist', label: 'Expressionniste', icon: '🔥', desc: 'Coups de pinceau marqués, émotionnel, dramatique', prompt: 'expressionist style, bold brushstrokes, emotional, dramatic' },
  ],
};

/**
 * Options de palette
 */
const PALETTE_OPTIONS = {
  temperature: [
    { id: 'warm', label: 'Chaud' },
    { id: 'cold', label: 'Froid' },
    { id: 'neutral', label: 'Neutre' },
    { id: 'vibrant', label: 'Vibrant' },
  ],
  contrast: [
    { id: 'light', label: 'Claire' },
    { id: 'dark', label: 'Sombre' },
    { id: 'contrasted', label: 'Contrastée' },
  ],
};

/** Style et palette sélectionnés */
let selectedStyle = null;
let selectedTemperature = null;
let selectedContrast = null;

/**
 * Initialise l'écran 6 — affiche les styles et la palette
 */
function initScreen6() {
  // Restaurer les choix précédents
  if (State.visualStyle) {
    selectedStyle = State.visualStyle.styleId;
    selectedTemperature = State.visualStyle.temperature;
    selectedContrast = State.visualStyle.contrast;
  }

  renderStyleCards();
  renderPaletteOptions();
}

/**
 * Affiche les 4 cartes de style visuel
 */
function renderStyleCards() {
  const mode = AppState.mode || 'podcast';
  const styles = VISUAL_STYLES[mode] || VISUAL_STYLES.podcast;
  const container = document.getElementById('style-cards');
  if (!container) return;

  container.innerHTML = styles.map(style => `
    <div class="style-card ${selectedStyle === style.id ? 'style-card--selected' : ''}"
         data-style="${style.id}" onclick="selectStyle('${style.id}')">
      <div class="style-card__preview style-card__preview--static">
        <span class="style-card__icon">${style.icon || '🎨'}</span>
      </div>
      <div class="style-card__info">
        <h4 class="style-card__label">${style.label}</h4>
        <p class="style-card__desc">${style.desc || ''}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Génère une image de prévisualisation pour un style
 * Utilise le personnage principal du ID IP + le style choisi
 * @param {string} styleId — id du style
 */
async function generateStylePreview(styleId) {
  const mode = AppState.mode || 'podcast';
  const styles = VISUAL_STYLES[mode] || VISUAL_STYLES.podcast;
  const style = styles.find(s => s.id === styleId);
  if (!style) return;

  const previewEl = document.getElementById(`style-preview-${styleId}`);
  previewEl.innerHTML = `
    <div class="style-card__loading">
      <div class="loading__spinner"></div>
      <span>Génération…</span>
    </div>
  `;

  try {
    // Récupérer le personnage principal du ID IP
    const canon = State.idIP || {};
    const mainChar = (canon.characters && canon.characters[0]) || {};
    const charDesc = mainChar.visualPrompt || mainChar.description || 'a character portrait';

    // Récupérer l'image de référence (premier personnage)
    let imageRef = null;
    const refs = await dbGetAll(STORES.CHARACTER_REFS);
    if (refs.length > 0) {
      const blob = new Blob([refs[0].data], { type: refs[0].type });
      imageRef = await blobToBase64(blob);
    }

    // Construire le prompt
    const prompt = `${charDesc}, ${style.prompt}, portrait, high quality`;

    // Générer via Replicate
    const imageUrl = await replicateGenerateImage(
      { prompt, imageRef, width: 512, height: 512 },
      (progress) => {
        previewEl.innerHTML = `
          <div class="style-card__loading">
            <div class="loading__spinner"></div>
            <span>${progress.status === 'starting' ? 'Démarrage…' : 'Génération…'}</span>
          </div>
        `;
      }
    );

    // Afficher l'image
    previewEl.innerHTML = `<img src="${imageUrl}" alt="${style.label}" class="style-card__img">`;

  } catch (err) {
    previewEl.innerHTML = `
      <div class="style-card__placeholder">
        <p class="status--error" style="font-size:12px">${err.message}</p>
        <button class="btn btn--small btn--secondary" onclick="event.stopPropagation(); generateStylePreview('${styleId}')">
          Réessayer
        </button>
      </div>
    `;
  }
}

/**
 * Sélectionne un style visuel
 * @param {string} styleId — id du style
 */
function selectStyle(styleId) {
  selectedStyle = styleId;

  // Mise à jour visuelle
  document.querySelectorAll('.style-card').forEach(card => {
    card.classList.toggle('style-card--selected', card.dataset.style === styleId);
  });

  checkScreen6Ready();
}

/**
 * Affiche les options de palette (température + contraste)
 */
function renderPaletteOptions() {
  // Température
  const tempContainer = document.getElementById('palette-temperature');
  if (!tempContainer) return;
  tempContainer.innerHTML = PALETTE_OPTIONS.temperature.map(opt => `
    <button class="palette-btn ${selectedTemperature === opt.id ? 'palette-btn--selected' : ''}"
            onclick="selectTemperature('${opt.id}')">
      ${opt.label}
    </button>
  `).join('');

  // Contraste
  const contrastContainer = document.getElementById('palette-contrast');
  if (!contrastContainer) return;
  contrastContainer.innerHTML = PALETTE_OPTIONS.contrast.map(opt => `
    <button class="palette-btn ${selectedContrast === opt.id ? 'palette-btn--selected' : ''}"
            onclick="selectContrast('${opt.id}')">
      ${opt.label}
    </button>
  `).join('');
}

/**
 * Sélectionne une température de palette
 * @param {string} tempId
 */
function selectTemperature(tempId) {
  selectedTemperature = tempId;
  renderPaletteOptions();
  checkScreen6Ready();
}

/**
 * Sélectionne un niveau de contraste
 * @param {string} contrastId
 */
function selectContrast(contrastId) {
  selectedContrast = contrastId;
  renderPaletteOptions();
  checkScreen6Ready();
}

/**
 * Vérifie si tous les choix de l'écran 6 sont faits
 * Active le bouton Continuer si oui
 */
function checkScreen6Ready() {
  const ready = selectedStyle && selectedTemperature && selectedContrast;

  if (ready) {
    // Sauvegarder les choix visuels
    const mode = AppState.mode || 'podcast';
    const styles = VISUAL_STYLES[mode] || VISUAL_STYLES.podcast;
    const style = styles.find(s => s.id === selectedStyle);

    State.visualStyle = {
      styleId: selectedStyle,
      styleLabel: style ? style.label : selectedStyle,
      stylePrompt: style ? style.prompt : '',
      temperature: selectedTemperature,
      contrast: selectedContrast,
    };
    State.save();
  }

  // Support both screen-6 (legacy) and screen-3b (merged)
  const btn = document.getElementById('btn-next-screen6');
  if (btn) btn.disabled = !ready;
  const btn3b = document.getElementById('btn-next-screen3b');
  // Don't disable btn3b here — saveCanon handles that
}
