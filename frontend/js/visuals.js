// visuals.js — Écran 6 : Choix du style visuel + palette
// Génère 4 images test via Flux Redux pour comparer les styles

/**
 * Styles visuels disponibles selon le mode
 */
const VISUAL_STYLES = {
  // Webtoon — styles d'illustration
  'podcast-webtoon': [
    { id: 'manga', label: 'Manga / Manhwa', icon: '⚡', desc: 'Grands yeux, dynamisme, expressions codifiées, style webtoon coréen', prompt: 'manga art, Japanese manga illustration, anime cel-shaded style, bold ink outlines, large expressive eyes, 2D hand-drawn, manhwa webtoon aesthetic, vibrant flat colors, dynamic composition' },
    { id: 'semi-realistic', label: 'Semi-réaliste', icon: '📷', desc: 'Proportions proches du réel, détails soignés, éclairage cinématique', prompt: 'semi-realistic illustration, detailed proportions, cinematic lighting, polished details, digital painting' },
    { id: 'cartoon', label: 'Cartoon / Stylisé', icon: '🎨', desc: 'Formes simplifiées, expressivité exagérée, style ludique', prompt: 'cartoon style, bold outlines, flat colors, exaggerated expressions, playful, stylized' },
    { id: 'flat-design', label: 'Flat design illustré', icon: '🖌️', desc: 'Aplats de couleur, minimalisme graphique, moderne', prompt: 'flat design illustration, solid colors, minimalist graphic style, modern, clean shapes' },
    { id: 'ligne-claire', label: 'Ligne claire', icon: '✏️', desc: 'Contours nets, peu d\'ombre, lisibilité maximale', prompt: 'ligne claire style, clear outlines, minimal shading, maximum readability, clean illustration' },
    { id: 'realistic', label: 'Réaliste', icon: '🎬', desc: 'Photoréaliste, rendu cinématique, haute fidélité', prompt: 'photorealistic, highly detailed, cinematic render, high fidelity, realistic lighting' },
    { id: 'sketch', label: 'Sketch / Rough', icon: '🖊️', desc: 'Trait visible, ambiance artistique, volontairement brut', prompt: 'sketch style, visible strokes, artistic rough look, hand-drawn feel, raw aesthetic' },
  ],
  // Micro-drama — genres cinématographiques
  'podcast-micro-drama': [
    { id: 'drama', label: 'Drame', icon: '🎭', desc: 'Éclairage intimiste, émotions intenses, tons profonds', prompt: 'cinematic drama, intimate lighting, deep emotions, warm shadows, close-up character shots, moody atmosphere, film grain' },
    { id: 'thriller', label: 'Thriller / Suspense', icon: '🔪', desc: 'Tension, ombres marquées, cadrage serré, ambiance oppressante', prompt: 'thriller cinematography, high contrast lighting, deep shadows, tense atmosphere, dutch angles, suspenseful mood, dark color grading' },
    { id: 'romance', label: 'Romance', icon: '💕', desc: 'Lumière douce, tons chauds, ambiance rêveuse et poétique', prompt: 'romantic cinematic style, soft golden lighting, warm tones, dreamy atmosphere, lens flare, shallow depth of field, tender mood' },
    { id: 'scifi', label: 'Science-Fiction', icon: '🚀', desc: 'Futuriste, néons, technologie avancée, ambiance cyberpunk ou spatiale', prompt: 'science fiction cinematic, futuristic environment, neon lighting, advanced technology, cyberpunk aesthetic, holographic displays, dark moody atmosphere' },
    { id: 'action', label: 'Action', icon: '💥', desc: 'Dynamique, mouvement, couleurs vives, rythme soutenu', prompt: 'action movie cinematography, dynamic camera angles, motion blur, vivid saturated colors, explosive energy, fast-paced, dramatic lighting' },
    { id: 'documentary', label: 'Documentaire', icon: '📹', desc: 'Authentique, naturel, réaliste, cadrage journalistique', prompt: 'documentary style, natural lighting, realistic, handheld camera feel, authentic atmosphere, journalistic framing, raw unfiltered look' },
    { id: 'comedy', label: 'Comédie', icon: '😄', desc: 'Lumière claire, couleurs vives, ambiance légère et joyeuse', prompt: 'comedy cinematic style, bright even lighting, vivid cheerful colors, lighthearted atmosphere, warm tones, playful composition' },
    { id: 'noir', label: 'Film Noir', icon: '🌑', desc: 'Noir et blanc, contrastes extrêmes, ombres dramatiques', prompt: 'film noir style, high contrast black and white, dramatic shadows, venetian blind lighting, smoke, mysterious atmosphere, 1940s aesthetic' },
  ],
  // Webtoon peinture
  'peinture-webtoon': [
    { id: 'faithful', label: 'Fidèle à l\'artiste', icon: '🖼️', desc: 'Technique et palette fidèles à l\'original', prompt: 'faithful to the original art style, same technique and palette' },
    { id: 'manga', label: 'Manga / Manhwa', icon: '⚡', desc: 'Adaptation manga, dynamisme, style webtoon', prompt: 'manga art, Japanese manga illustration, anime cel-shaded style, bold ink outlines, large expressive eyes, 2D hand-drawn, manhwa webtoon aesthetic, vibrant flat colors, dynamic composition' },
    { id: 'semi-realistic', label: 'Semi-réaliste', icon: '📷', desc: 'Réalisme pictural, détaillé, artistique', prompt: 'semi-realistic illustration, painterly, detailed, artistic' },
    { id: 'flat-design', label: 'Flat design', icon: '🖌️', desc: 'Aplats de couleur, minimalisme, moderne', prompt: 'flat design illustration, solid colors, minimalist, modern' },
    { id: 'expressionist', label: 'Expressionniste', icon: '🔥', desc: 'Coups de pinceau marqués, émotionnel, dramatique', prompt: 'expressionist style, bold brushstrokes, emotional, dramatic' },
    { id: 'ligne-claire', label: 'Ligne claire', icon: '✏️', desc: 'Contours nets, lisibilité maximale', prompt: 'ligne claire style, clear outlines, minimal shading, clean illustration' },
  ],
  // Micro-drama peinture
  'peinture-micro-drama': [
    { id: 'faithful-cine', label: 'Fidèle + Cinéma', icon: '🖼️', desc: 'Style de l\'artiste avec mise en scène cinématique', prompt: 'faithful to original art style, cinematic composition, dramatic lighting, film-like atmosphere, same palette as original artwork' },
    { id: 'drama', label: 'Drame', icon: '🎭', desc: 'Éclairage intimiste, émotions intenses, tons profonds', prompt: 'cinematic drama, intimate lighting, deep emotions, warm shadows, moody atmosphere, film grain' },
    { id: 'romance', label: 'Romance', icon: '💕', desc: 'Lumière douce, tons chauds, ambiance rêveuse', prompt: 'romantic cinematic style, soft golden lighting, warm tones, dreamy atmosphere, lens flare, tender mood' },
    { id: 'scifi', label: 'Science-Fiction', icon: '🚀', desc: 'Futuriste, néons, ambiance cyberpunk ou spatiale', prompt: 'science fiction cinematic, futuristic, neon lighting, cyberpunk aesthetic, dark moody atmosphere' },
    { id: 'action', label: 'Action', icon: '💥', desc: 'Dynamique, couleurs vives, rythme soutenu', prompt: 'action movie cinematography, dynamic angles, vivid colors, explosive energy, dramatic lighting' },
    { id: 'expressionist', label: 'Expressionniste', icon: '🔥', desc: 'Coups de pinceau dramatiques, émotionnel', prompt: 'expressionist cinematic style, bold brushstrokes, emotional, dramatic lighting, painterly film look' },
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
 * Retourne la clé de styles adaptée au mode + format de sortie
 * Ex: 'podcast-webtoon', 'peinture-micro-drama'
 */
function getStyleKey() {
  const mode = AppState.mode || 'podcast';
  const output = AppState.outputFormat || 'webtoon';
  // Pour "both", on affiche les styles webtoon par défaut
  const effectiveOutput = output === 'both' ? 'webtoon' : output;
  const key = `${mode}-${effectiveOutput}`;
  return VISUAL_STYLES[key] ? key : `${mode}-webtoon`;
}

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
  const styles = VISUAL_STYLES[getStyleKey()];
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
  const styles = VISUAL_STYLES[getStyleKey()];
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
    const styles = VISUAL_STYLES[getStyleKey()];
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
