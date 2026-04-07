// app.js — Router SPA + initialisation du stepper
// Gère la navigation entre les écrans sans rechargement de page

/**
 * Définition des écrans du parcours utilisateur
 * Chaque écran a un id, un label pour le stepper, et un numéro d'ordre
 */
const SCREENS = [
  { id: 'screen-0', label: 'Accueil', step: 0 },
  { id: 'screen-1', label: 'Asset IP', step: 1 },
  { id: 'screen-2', label: 'Extraction', step: 2 },
  { id: 'screen-3b', label: 'ID IP', step: 3 },
  { id: 'screen-4', label: 'Épisodes', step: 4 },
  { id: 'screen-5', label: 'Scripts', step: 5 },
  { id: 'screen-7', label: 'Images', step: 6, branch: 'both' },
  { id: 'screen-8', label: 'Storyboard', step: 7, branch: 'both' },
  { id: 'screen-9', label: 'Animation', step: 8, branch: 'micro-drama' },
  { id: 'screen-10', label: 'Clips', step: 9, branch: 'micro-drama' },
  { id: 'screen-11', label: 'Assemblage', step: 10, branch: 'micro-drama' },
  { id: 'screen-12', label: 'Export vidéo', step: 11, branch: 'micro-drama' },
  { id: 'screen-13', label: 'Export Webtoon', step: 12, branch: 'webtoon' },
];

/**
 * État global de l'application
 */
const AppState = {
  currentScreen: 'screen-0',
  mode: null,           // 'podcast' ou 'peinture'
  outputFormat: null,   // 'webtoon', 'micro-drama' ou 'both'

  /** Sauvegarde l'état dans localStorage (clé séparée de State) */
  save() {
    localStorage.setItem('ip-transformer-app', JSON.stringify({
      currentScreen: this.currentScreen,
      mode: this.mode,
      outputFormat: this.outputFormat,
    }));
    // Synchroniser aussi avec State pour persistance globale
    State.currentScreen = this.currentScreen;
    State.mode = this.mode;
    State.outputFormat = this.outputFormat;
    State.save();
  },

  /** Restaure l'état depuis localStorage */
  load() {
    const saved = localStorage.getItem('ip-transformer-app');
    if (saved) {
      const data = JSON.parse(saved);
      this.currentScreen = data.currentScreen || 'screen-0';
      this.mode = data.mode || null;
      this.outputFormat = data.outputFormat || null;
    } else {
      // Fallback : lire depuis State (migration)
      this.currentScreen = State.currentScreen || 'screen-0';
      this.mode = State.mode || null;
      this.outputFormat = State.outputFormat || null;
    }
  },
};

/**
 * Navigue vers un écran donné
 * @param {string} screenId — l'id de l'écran cible (ex: 'screen-2')
 */
function navigateTo(screenId) {
  // Masquer tous les écrans
  const allScreens = document.querySelectorAll('.screen');
  allScreens.forEach(screen => {
    screen.classList.remove('screen--active');
  });

  // Afficher l'écran cible
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('screen--active');
  }

  // Mettre à jour l'état
  AppState.currentScreen = screenId;
  AppState.save();

  // Mettre à jour le stepper
  if (typeof updateStepper === 'function') {
    updateStepper(screenId);
  }

  // Initialiser l'écran si nécessaire
  if (screenId === 'screen-1') initScreen1();
  if (screenId === 'screen-2') initScreen2();
  if (screenId === 'screen-3b') initScreen3b();
  if (screenId === 'screen-4') initScreen4();
  if (screenId === 'screen-5') initScreen5();
  if (screenId === 'screen-7') initScreen7();
  if (screenId === 'screen-8') initScreen8();
  if (screenId === 'screen-9') initScreen9();
  if (screenId === 'screen-10') initScreen10();
  if (screenId === 'screen-11') initScreen11();
  if (screenId === 'screen-12') initScreen12();
  if (screenId === 'screen-13') initScreen13();

  // Mettre à jour l'URL (hash)
  window.location.hash = screenId;
}

/**
 * Retourne la liste des écrans visibles selon le format de sortie choisi
 * @returns {Array} — écrans filtrés
 */
function getVisibleScreens() {
  return SCREENS.filter(screen => {
    if (!screen.branch) return true;
    if (screen.branch === 'both') return true;
    if (!AppState.outputFormat) return false;
    if (AppState.outputFormat === 'both') return true;
    return screen.branch === AppState.outputFormat;
  });
}

/**
 * Navigue vers l'écran suivant
 */
function nextScreen() {
  const visible = getVisibleScreens();
  const currentIndex = visible.findIndex(s => s.id === AppState.currentScreen);
  if (currentIndex < visible.length - 1) {
    navigateTo(visible[currentIndex + 1].id);
  }
}

/**
 * Navigue vers l'écran précédent
 */
function prevScreen() {
  const visible = getVisibleScreens();
  const currentIndex = visible.findIndex(s => s.id === AppState.currentScreen);
  if (currentIndex > 0) {
    navigateTo(visible[currentIndex - 1].id);
  }
}

/**
 * Sélection du format d'entrée depuis l'écran d'accueil
 * @param {string} mode — 'podcast' ou 'peinture'
 */
function selectInput(mode) {
  AppState.mode = mode;
  document.querySelectorAll('#mode-podcast, #mode-peinture').forEach(el => el.classList.remove('mode-card--selected'));
  const el = document.getElementById(`mode-${mode}`);
  if (el) el.classList.add('mode-card--selected');
  checkStartReady();
}

/**
 * Sélection du format de sortie depuis l'écran d'accueil
 * @param {string} format — 'webtoon', 'micro-drama' ou 'both'
 */
function selectOutput(format) {
  AppState.outputFormat = format;
  document.querySelectorAll('[id^="output-"]').forEach(el => el.classList.remove('format-card--selected'));
  const el = document.getElementById(`output-${format}`);
  if (el) el.classList.add('format-card--selected');
  if (typeof renderStepper === 'function') renderStepper();
  checkStartReady();
}

/**
 * Vérifie si les deux choix sont faits et active le bouton Commencer
 */
function checkStartReady() {
  const btn = document.getElementById('btn-start');
  if (btn) btn.disabled = !(AppState.mode && AppState.outputFormat);
}

/**
 * Lance le pipeline après sélection des formats
 */
function startPipeline() {
  AppState.save();
  navigateTo('screen-1');
}

/**
 * Backward compat: old selectMode calls redirect to selectInput
 * @param {string} mode — 'podcast' ou 'peinture'
 */
function selectMode(mode) {
  selectInput(mode);
}

// ============================================
// ÉCRAN 1 — Asset Loader
// ============================================

/**
 * Affiche le bon formulaire selon le mode choisi (podcast ou peinture)
 * Appelé automatiquement lors de la navigation vers l'écran 1
 */
function initScreen1() {
  const podcastSection = document.getElementById('asset-podcast');
  const peintureSection = document.getElementById('asset-peinture');

  if (AppState.mode === 'podcast') {
    podcastSection.style.display = 'block';
    peintureSection.style.display = 'none';
  } else if (AppState.mode === 'peinture') {
    podcastSection.style.display = 'none';
    peintureSection.style.display = 'block';
  }
}

/**
 * Affiche/masque la section YouTube selon la checkbox
 */
function toggleYoutubeSection() {
  const checkbox = document.getElementById('no-transcript-checkbox');
  const youtubeSection = document.getElementById('youtube-section');
  if (youtubeSection) {
    youtubeSection.style.display = checkbox.checked ? 'block' : 'none';
  }
}

/**
 * Valide le format d'une URL YouTube et active/désactive le bouton
 */
function validateYoutubeUrl() {
  const input = document.getElementById('youtube-url');
  const btn = document.getElementById('btn-fetch-transcript');
  const url = input.value.trim();

  // Regex pour les URLs YouTube valides
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
  const isValid = youtubeRegex.test(url);

  btn.disabled = !isValid;
  input.classList.toggle('input--error', url.length > 0 && !isValid);
}

/**
 * Lance l'extraction du transcript YouTube via le Worker
 */
async function fetchTranscript() {
  const url = document.getElementById('youtube-url').value.trim();
  const statusEl = document.getElementById('youtube-status');

  // Afficher le chargement
  showLoading('screen-1-loading', 'youtube', {
    message: 'Extraction du transcript YouTube…',
  });
  statusEl.innerHTML = '';

  try {
    const result = await fetchYoutubeTranscript(url);

    // Sauvegarder dans l'état
    State.youtubeUrl = url;
    State.transcriptText = result.transcript;
    State.transcriptSource = result.source; // 'youtube-subs' ou 'whisper'
    State.save();

    // Feedback succès
    statusEl.innerHTML = `<span class="status--success">✓ Transcript extrait (${result.source}) — ${result.transcript.length} caractères</span>`;

    // Activer le bouton Continuer
    document.getElementById('btn-next-screen1').disabled = false;
  } catch (err) {
    statusEl.innerHTML = `<span class="status--error">✗ ${err.message}</span>`;
  } finally {
    hideLoading('screen-1-loading');
  }
}

/**
 * Gère l'upload d'un fichier transcript (.txt, .srt, .vtt)
 * @param {Event} event — événement change de l'input file
 */
function handleTranscriptUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('transcript-file-status');
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target.result;

    // Sauvegarder dans l'état
    State.transcriptText = text;
    State.transcriptSource = 'file-upload';
    State.save();

    // Feedback succès
    statusEl.innerHTML = `<span class="status--success">✓ ${file.name} chargé — ${text.length} caractères</span>`;

    // Activer le bouton Continuer
    document.getElementById('btn-next-screen1').disabled = false;
  };

  reader.onerror = () => {
    statusEl.innerHTML = `<span class="status--error">✗ Erreur de lecture du fichier</span>`;
  };

  reader.readAsText(file);
}

/**
 * Gère l'upload d'œuvres (mode peinture)
 * Vérifie : 3-10 images, max 5 Mo chacune, formats acceptés
 * @param {Event} event — événement change de l'input file
 */
async function handlePaintingsUpload(event) {
  const files = Array.from(event.target.files);
  const statusEl = document.getElementById('paintings-status');
  const previewEl = document.getElementById('paintings-preview');

  // Validation du nombre
  if (files.length < 3) {
    statusEl.innerHTML = `<span class="status--error">✗ Minimum 3 images requises (${files.length} sélectionnée${files.length > 1 ? 's' : ''})</span>`;
    return;
  }
  if (files.length > 10) {
    statusEl.innerHTML = `<span class="status--error">✗ Maximum 10 images (${files.length} sélectionnées)</span>`;
    return;
  }

  // Validation de la taille (5 Mo max par image)
  const maxSize = 5 * 1024 * 1024;
  const tooLarge = files.filter(f => f.size > maxSize);
  if (tooLarge.length > 0) {
    statusEl.innerHTML = `<span class="status--error">✗ ${tooLarge.length} image(s) dépassent 5 Mo</span>`;
    return;
  }

  // Vider l'ancien contenu IndexedDB
  await dbClear(STORES.PAINTINGS);
  previewEl.innerHTML = '';

  // Lire et stocker chaque image
  let count = 0;
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const url = URL.createObjectURL(blob);

    // Sauvegarder dans IndexedDB
    await dbSave(STORES.PAINTINGS, {
      name: file.name,
      type: file.type,
      size: file.size,
      data: arrayBuffer,
    });

    // Ajouter la prévisualisation
    const img = document.createElement('div');
    img.className = 'painting-thumb';
    img.innerHTML = `
      <img src="${url}" alt="${file.name}">
      <span class="painting-thumb__name">${file.name}</span>
    `;
    previewEl.appendChild(img);

    count++;
  }

  // Mettre à jour l'état
  State.paintingCount = count;
  State.save();

  // Feedback succès
  statusEl.innerHTML = `<span class="status--success">✓ ${count} œuvre${count > 1 ? 's' : ''} chargée${count > 1 ? 's' : ''}</span>`;

  // Activer le bouton Continuer
  document.getElementById('btn-next-screen1').disabled = false;
}

// ============================================
// ÉCRAN 2 — Analyse IA de l'IP source
// ============================================

/**
 * Initialise l'écran 2 et lance l'analyse si pas encore faite
 */
function initScreen2() {
  // Si l'analyse existe déjà dans l'état, l'afficher directement
  if (State.analysis) {
    displayAnalysis(State.analysis);
    return;
  }
  // Sinon lancer l'analyse
  runAnalysis();
}

/**
 * Lance l'analyse IA selon le mode (podcast ou peinture)
 */
async function runAnalysis() {
  const resultEl = document.getElementById('screen-2-result');
  if (resultEl) resultEl.style.display = 'none';

  // Vérifier que le transcript existe (mode podcast)
  if (AppState.mode === 'podcast' && !State.transcriptText) {
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `<div class="card"><p class="status--error">Aucun transcript chargé. Retournez à l'écran Assets pour importer un fichier.</p>
        <button class="btn btn--secondary" onclick="navigateTo('screen-1')" style="margin-top:16px">← Retour aux Assets</button></div>`;
    }
    return;
  }

  // Afficher le chargement
  showLoading('screen-2-loading', 'claude', {
    message: AppState.mode === 'podcast'
      ? 'Analyse du transcript en cours…'
      : 'Analyse des œuvres en cours…',
  });

  try {
    let prompt = '';
    let options = {};

    if (AppState.mode === 'podcast') {
      prompt = buildPodcastAnalysisPrompt(State.transcriptText);
    } else {
      // Mode peinture : récupérer les images depuis IndexedDB
      const paintings = await dbGetAll(STORES.PAINTINGS);
      const images = await convertPaintingsToBase64(paintings);
      prompt = buildPaintingAnalysisPrompt();
      options = { images };
    }

    const result = await callClaude(prompt, options);

    // Parser la réponse JSON de Claude
    const analysis = parseAnalysisResponse(result, AppState.mode);

    // Sauvegarder dans l'état
    State.analysis = analysis;
    State.save();

    // Afficher le résultat
    displayAnalysis(analysis);

  } catch (err) {
    hideLoading('screen-2-loading');
    const resultEl = document.getElementById('screen-2-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `<div class="card"><p class="status--error">Erreur : ${err.message}</p>
        <button class="btn btn--primary" onclick="runAnalysis()" style="margin-top:16px">Réessayer</button></div>`;
    }
  }
}

/**
 * Construit le prompt d'analyse pour un transcript de podcast
 * @param {string} transcript — texte du transcript
 * @returns {string}
 */
function buildPodcastAnalysisPrompt(transcript) {
  return `Tu es un analyste narratif. Analyse ce transcript de podcast et extrais les éléments suivants en JSON.

RÈGLES :
- Extrais UNIQUEMENT des faits et citations réels du transcript.
- NE PAS inventer de faits. Adapter la forme, pas le fond.
- Les citations doivent être EXACTES (verbatim du transcript).

FORMAT DE RÉPONSE (JSON strict) :
{
  "speakers": [
    { "name": "Nom", "role": "Rôle/description", "color": "#hex" }
  ],
  "facts": [
    { "title": "Thème", "description": "Résumé du fait" }
  ],
  "quotes": [
    { "text": "Citation exacte", "speaker": "Nom de l'intervenant" }
  ]
}

TRANSCRIPT :
${(transcript || '').substring(0, 15000)}`;
}

/**
 * Construit le prompt d'analyse pour des peintures
 * @returns {string}
 */
function buildPaintingAnalysisPrompt() {
  return `Tu es un expert en analyse d'art visuel. Analyse ces œuvres picturales et extrais les éléments suivants en JSON.

RÈGLES :
- Respecte fidèlement la palette, l'ambiance et le style de l'artiste.
- Identifie les personnages récurrents et éléments visuels distinctifs.
- Décris l'univers visuel avec précision.

FORMAT DE RÉPONSE (JSON strict) :
{
  "visual": "Description détaillée de l'univers visuel global",
  "palette": [
    { "color": "#hex", "name": "Nom de la couleur", "usage": "Utilisation dans les œuvres" }
  ],
  "mood": "Description de l'ambiance et du ton émotionnel",
  "elements": [
    { "name": "Élément", "description": "Description et récurrence" }
  ]
}`;
}

/**
 * Convertit les peintures IndexedDB en base64 pour Claude Vision
 * @param {Array} paintings — tableau d'objets painting depuis IndexedDB
 * @returns {Promise<Array>} — tableau de strings base64
 */
async function convertPaintingsToBase64(paintings) {
  const images = [];
  for (const painting of paintings) {
    const blob = new Blob([painting.data], { type: painting.type });
    const base64 = await blobToBase64(blob);
    images.push(base64);
  }
  return images;
}

/**
 * Convertit un Blob en string base64
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Retirer le préfixe "data:image/...;base64,"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Parse la réponse de Claude et extrait le JSON
 * @param {Object} response — réponse brute de l'API
 * @param {string} mode — 'podcast' ou 'peinture'
 * @returns {Object} — données structurées
 */
function parseAnalysisResponse(response, mode) {
  // Extraire le contenu texte de la réponse
  const text = response.content || response.text || JSON.stringify(response);

  // Chercher le bloc JSON dans la réponse
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse IA invalide — pas de JSON trouvé');
  }

  const data = JSON.parse(jsonMatch[0]);
  data._mode = mode;
  return data;
}

/**
 * Affiche les résultats de l'analyse dans le DOM
 * @param {Object} analysis — données structurées de l'analyse
 */
function displayAnalysis(analysis) {
  hideLoading('screen-2-loading');

  const resultEl = document.getElementById('screen-2-result');
  if (!resultEl) return;
  resultEl.style.display = 'block';

  const podcastEl = document.getElementById('analysis-podcast');
  const peintureEl = document.getElementById('analysis-peinture');

  if (analysis._mode === 'podcast') {
    if (podcastEl) podcastEl.style.display = 'block';
    if (peintureEl) peintureEl.style.display = 'none';

    // Intervenants
    const speakersEl = document.getElementById('analysis-speakers');
    speakersEl.innerHTML = (analysis.speakers || []).map(s => `
      <div class="analysis-item">
        <span class="analysis-item__badge" style="background:${s.color || 'var(--accent-primary)'}"></span>
        <div>
          <strong>${s.name}</strong>
          <span class="analysis-item__detail">${s.role || ''}</span>
        </div>
      </div>
    `).join('');

    // Faits
    const factsEl = document.getElementById('analysis-facts');
    factsEl.innerHTML = (analysis.facts || []).map(f => `
      <div class="analysis-item">
        <strong>${f.title}</strong>
        <p class="analysis-item__detail">${f.description}</p>
      </div>
    `).join('');

    // Citations
    const quotesEl = document.getElementById('analysis-quotes');
    quotesEl.innerHTML = (analysis.quotes || []).map(q => `
      <blockquote class="quote-block">
        <p class="quote-block__text">"${q.text}"</p>
        <cite class="quote-block__author">— ${q.speaker}</cite>
      </blockquote>
    `).join('');

  } else {
    if (podcastEl) podcastEl.style.display = 'none';
    if (peintureEl) peintureEl.style.display = 'block';

    // Univers visuel
    document.getElementById('analysis-visual').innerHTML = `<p>${analysis.visual || ''}</p>`;

    // Palette
    const paletteEl = document.getElementById('analysis-palette');
    paletteEl.innerHTML = (analysis.palette || []).map(p => `
      <div class="palette-swatch">
        <div class="palette-swatch__color" style="background:${p.color}"></div>
        <span class="palette-swatch__name">${p.name}</span>
      </div>
    `).join('');

    // Ambiance
    document.getElementById('analysis-mood').innerHTML = `<p style="margin-top:16px">${analysis.mood || ''}</p>`;

    // Éléments récurrents
    const elementsEl = document.getElementById('analysis-elements');
    elementsEl.innerHTML = (analysis.elements || []).map(e => `
      <div class="analysis-item">
        <strong>${e.name}</strong>
        <p class="analysis-item__detail">${e.description}</p>
      </div>
    `).join('');
  }

  // Activer le bouton Continuer
  document.getElementById('btn-next-screen2').disabled = false;
}

// ============================================
// ÉCRAN 3b — ID IP / Bible de marque
// ============================================

/**
 * Initialise l'écran 3b — génère le canon si pas encore fait
 */
function initScreen3b() {
  if (State.idIP) {
    displayCanon(State.idIP);
  } else {
    generateCanon();
  }
  // Init visual style controls (moved from screen-6)
  if (typeof initScreen6 === 'function') initScreen6();
}

/**
 * Génère automatiquement le ID IP à partir de l'histoire et de l'analyse
 */
async function generateCanon() {
  const resultEl = document.getElementById('screen-3b-result');
  resultEl.style.display = 'none';

  showLoading('screen-3b-loading', 'claude', {
    message: 'Génération du ID IP…',
  });

  try {
    const prompt = buildCanonPrompt();
    const options = {};

    if (AppState.mode === 'peinture') {
      const paintings = await dbGetAll(STORES.PAINTINGS);
      options.images = await convertPaintingsToBase64(paintings);
    }

    const result = await callClaude(prompt, options);
    const canon = parseJSONResponse(result);

    State.idIP = canon;
    State.save();

    displayCanon(canon);

  } catch (err) {
    hideLoading('screen-3b-loading');
    const resultEl = document.getElementById('screen-3b-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div class="card"><p class="status--error">Erreur : ${err.message}</p>
      <button class="btn btn--primary" onclick="generateCanon()" style="margin-top:16px">Réessayer</button></div>`;
  }
}

/**
 * Construit le prompt de génération du ID IP
 * @returns {string}
 */
function buildCanonPrompt() {
  const analysisJSON = JSON.stringify(State.analysis, null, 2);

  return `Tu es un directeur artistique et scénariste. À partir de l'analyse suivante, génère un ID IP complet — la bible de référence qui garantit la cohérence de TOUTES les productions futures.

ANALYSE SOURCE :
${analysisJSON}

FORMAT DE RÉPONSE (JSON strict) :
{
  "synopsis": "Synopsis de l'histoire (3-5 phrases)",
  "characters": [
    {
      "name": "Nom",
      "description": "Description physique TRÈS détaillée (visage, corps, vêtements, posture, signes distinctifs)",
      "personality": "Traits de personnalité",
      "role": "Rôle dans l'histoire",
      "color": "#hex",
      "visualPrompt": "Prompt de description visuelle optimisé pour génération d'image"
    }
  ],
  "arcs": [
    { "title": "Titre de l'arc", "description": "Description de l'arc narratif" }
  ],
  "universe": "Description détaillée de l'univers (lieux, époque, atmosphère, règles)",
  "tone": "Ton narratif, registre de langue, ambiance émotionnelle",
  "constraints": "Ce que l'IA ne doit JAMAIS faire (interdits narratifs et visuels)",
  "visualStyle": "Style visuel global à respecter pour les images",
  "palette": [
    { "color": "#hex", "name": "Nom", "usage": "Utilisation" }
  ]
}`;
}

/**
 * Parse générique d'une réponse JSON de Claude
 * @param {Object} response — réponse brute
 * @returns {Object}
 */
function parseJSONResponse(response) {
  const text = response.content || response.text || JSON.stringify(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse IA invalide — pas de JSON trouvé');
  }
  return JSON.parse(jsonMatch[0]);
}

/**
 * Affiche le ID IP dans le DOM avec les champs éditables
 * @param {Object} canon — données du canon
 */
function displayCanon(canon) {
  hideLoading('screen-3b-loading');

  const resultEl = document.getElementById('screen-3b-result');
  if (!resultEl) return;
  resultEl.style.display = 'block';

  // Synopsis
  const synopsisEl = document.getElementById('canon-synopsis');
  if (synopsisEl) synopsisEl.innerHTML = `<p>${canon.synopsis || ''}</p>`;

  // Arcs
  const arcsEl = document.getElementById('canon-arcs');
  if (arcsEl) arcsEl.innerHTML = (canon.arcs || []).map((a, i) => `
    <div class="arc-item">
      <span class="arc-item__number">${i + 1}</span>
      <div>
        <h4 class="arc-item__title">${a.title}</h4>
        <p class="arc-item__desc">${a.description}</p>
      </div>
    </div>
  `).join('');

  // Personnages avec zone d'upload de référence
  const charsEl = document.getElementById('canon-characters');
  charsEl.innerHTML = (canon.characters || []).map((c, i) => `
    <div class="canon-character" data-index="${i}">
      <div class="canon-character__header">
        <div class="character-card__avatar" style="background:${c.color || 'var(--accent-primary)'}">
          ${(c.name || '?')[0].toUpperCase()}
        </div>
        <div>
          <h4 class="character-card__name">${c.name}</h4>
          <span class="character-card__role">${c.personality || ''}</span>
        </div>
      </div>
      <div class="canon-character__body">
        <textarea class="textarea textarea--small canon-char-desc" rows="3" data-index="${i}">${c.description || ''}</textarea>
        <div class="canon-character__ref">
          <label class="upload-zone upload-zone--mini" id="char-ref-zone-${i}">
            <input type="file" accept="image/*" onchange="handleCharRefUpload(event, ${i})" hidden>
            <div class="upload-zone__content">
              <span class="upload-zone__text">Photo de référence</span>
            </div>
          </label>
          <div class="canon-character__ref-preview" id="char-ref-preview-${i}"></div>
        </div>
      </div>
    </div>
  `).join('');

  // Champs éditables
  document.getElementById('canon-universe').value = canon.universe || '';
  document.getElementById('canon-tone').value = canon.tone || '';
  document.getElementById('canon-constraints').value = canon.constraints || '';

  // Références visuelles (mode peinture)
  if (AppState.mode === 'peinture') {
    document.getElementById('canon-visual-refs').style.display = 'block';
    document.getElementById('canon-visual-style').value = canon.visualStyle || '';

    const paletteEl = document.getElementById('canon-palette');
    paletteEl.innerHTML = (canon.palette || []).map(p => `
      <div class="palette-swatch">
        <div class="palette-swatch__color" style="background:${p.color}"></div>
        <span class="palette-swatch__name">${p.name}</span>
      </div>
    `).join('');
  }

  // Charger les refs existantes depuis IndexedDB
  loadCharacterRefs();

  // Le bouton Continuer est activé par saveCanon()
}

/**
 * Upload d'une photo de référence pour un personnage
 * @param {Event} event — événement change
 * @param {number} charIndex — index du personnage
 */
async function handleCharRefUpload(event, charIndex) {
  const file = event.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const url = URL.createObjectURL(blob);

  // Sauvegarder dans IndexedDB
  await dbSave(STORES.CHARACTER_REFS, {
    charIndex,
    name: file.name,
    type: file.type,
    data: arrayBuffer,
  });

  // Afficher la prévisualisation
  const previewEl = document.getElementById(`char-ref-preview-${charIndex}`);
  previewEl.innerHTML = `<img src="${url}" alt="Référence ${charIndex}" class="canon-ref-img">`;
}

/**
 * Charge les photos de référence existantes depuis IndexedDB
 */
async function loadCharacterRefs() {
  const refs = await dbGetAll(STORES.CHARACTER_REFS);
  for (const ref of refs) {
    const blob = new Blob([ref.data], { type: ref.type });
    const url = URL.createObjectURL(blob);
    const previewEl = document.getElementById(`char-ref-preview-${ref.charIndex}`);
    if (previewEl) {
      previewEl.innerHTML = `<img src="${url}" alt="Référence" class="canon-ref-img">`;
    }
  }
}

/**
 * Sauvegarde le ID IP avec les modifications de l'utilisateur
 */
function saveCanon() {
  // Validate visual style is selected
  if (!State.visualStyle || !State.visualStyle.styleId) {
    alert('Veuillez choisir un style visuel avant de valider.');
    return;
  }

  const canon = State.idIP || {};

  // Récupérer les valeurs éditées
  const universeEl = document.getElementById('canon-universe');
  const toneEl = document.getElementById('canon-tone');
  const constraintsEl = document.getElementById('canon-constraints');
  if (universeEl) canon.universe = universeEl.value;
  if (toneEl) canon.tone = toneEl.value;
  if (constraintsEl) canon.constraints = constraintsEl.value;

  if (AppState.mode === 'peinture') {
    const vsEl = document.getElementById('canon-visual-style');
    if (vsEl) canon.visualStyle = vsEl.value;
  }

  // Récupérer les descriptions éditées des personnages
  const descTextareas = document.querySelectorAll('.canon-char-desc');
  descTextareas.forEach(ta => {
    const index = parseInt(ta.dataset.index);
    if (canon.characters && canon.characters[index]) {
      canon.characters[index].description = ta.value;
    }
  });

  // Sauvegarder
  State.idIP = canon;
  State.save();

  // Activer le bouton Continuer
  const nextBtn = document.getElementById('btn-next-screen3b');
  if (nextBtn) nextBtn.disabled = false;

  // Feedback visuel
  const btn = document.querySelector('#screen-3b .action-row .btn--primary');
  if (btn) {
    btn.textContent = '✓ ID IP validé';
    btn.classList.add('btn--success');
    setTimeout(() => {
      btn.textContent = 'Valider l\'ID IP';
      btn.classList.remove('btn--success');
    }, 2000);
  }
}

/**
 * Régénère le ID IP (alias pour le bouton)
 */
function regenerateCanon() {
  State.idIP = null;
  generateCanon();
}

// ============================================
// ÉCRAN 4 — Découpage en 5 épisodes
// ============================================

/**
 * Initialise l'écran 4 — génère les épisodes si pas encore fait
 */
function initScreen4() {
  if (State.episodes) {
    displayEpisodes(State.episodes);
    return;
  }
  runEpisodes();
}

/**
 * Lance le découpage en 5 épisodes via Claude
 */
async function runEpisodes() {
  const resultEl = document.getElementById('screen-4-result');
  resultEl.style.display = 'none';

  showLoading('screen-4-loading', 'claude', {
    message: 'Découpage en épisodes…',
  });

  try {
    const prompt = buildEpisodesPrompt();
    const result = await callClaude(prompt);
    const data = parseJSONResponse(result);
    const episodes = data.episodes || data;

    State.episodes = episodes;
    State.save();

    displayEpisodes(episodes);

  } catch (err) {
    hideLoading('screen-4-loading');
    const resultEl = document.getElementById('screen-4-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div class="card"><p class="status--error">Erreur : ${err.message}</p>
      <button class="btn btn--primary" onclick="runEpisodes()" style="margin-top:16px">Réessayer</button></div>`;
  }
}

/**
 * Construit le prompt de découpage épisodique
 * Inclut le ID IP comme verrou de fidélité
 * @returns {string}
 */
function buildEpisodesPrompt() {
  const canonJSON = JSON.stringify(State.idIP, null, 2);

  const formatInfo = AppState.mode === 'podcast'
    ? 'Format cible : WEBTOON (3 panneaux par épisode, narration visuelle avec bulles de dialogue)'
    : 'Format cible : MICRO-DRAMA VIDÉO (3 sous-scènes de ~15 secondes par épisode, ~45s total)';

  return `Tu es un scénariste sérialisé. Découpe l'histoire suivante en exactement 5 ÉPISODES.

ID IP (à respecter STRICTEMENT — contient synopsis, arcs, personnages et univers) :
${canonJSON}

${formatInfo}

RÈGLES :
- Exactement 5 épisodes
- Chaque épisode a un arc complet (début, tension, résolution partielle)
- L'épisode 1 pose le décor et les personnages
- L'épisode 5 conclut l'histoire
- Chaque épisode doit donner envie de voir le suivant (cliffhanger ou question ouverte)
- Rester FIDÈLE au ID IP

FORMAT DE RÉPONSE (JSON strict) :
{
  "episodes": [
    {
      "number": 1,
      "title": "Titre de l'épisode",
      "synopsis": "Synopsis détaillé (3-5 phrases)",
      "hook": "Accroche ou cliffhanger de fin d'épisode",
      "keyMoments": ["Moment clé 1", "Moment clé 2", "Moment clé 3"]
    }
  ]
}`;
}

/**
 * Affiche les 5 épisodes dans le DOM
 * @param {Array} episodes — tableau de 5 épisodes
 */
function displayEpisodes(episodes) {
  hideLoading('screen-4-loading');

  const resultEl = document.getElementById('screen-4-result');
  resultEl.style.display = 'block';

  const listEl = document.getElementById('episodes-list');
  listEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => `
    <div class="episode-card" data-episode="${ep.number || i + 1}">
      <div class="episode-card__header">
        <span class="episode-card__number">EP ${ep.number || i + 1}</span>
        <h3 class="episode-card__title">${ep.title || ''}</h3>
      </div>
      <p class="episode-card__synopsis">${ep.synopsis || ''}</p>
      <div class="episode-card__moments">
        ${(ep.keyMoments || []).map(m => `<span class="episode-card__moment">${m}</span>`).join('')}
      </div>
      <div class="episode-card__hook">
        <strong>Accroche :</strong> ${ep.hook || ''}
      </div>
    </div>
  `).join('');

  // Activer le bouton Continuer
  document.getElementById('btn-next-screen4').disabled = false;
}

// ============================================
// ÉCRAN 5 — Scripts détaillés (3 sous-scènes/épisode)
// ============================================

/** Épisode actuellement sélectionné dans l'onglet scripts */
let currentScriptEpisode = 1;

/**
 * Initialise l'écran 5 — affiche les onglets et le script du premier épisode
 */
function initScreen5() {
  // Initialiser les scripts dans State si nécessaire
  if (!State.scripts) {
    State.scripts = {};
  }

  renderScriptTabs();
  selectScriptEpisode(1);
}

/**
 * Affiche les onglets de sélection d'épisode
 */
function renderScriptTabs() {
  const tabsEl = document.getElementById('script-tabs');
  const episodes = State.episodes || [];

  tabsEl.innerHTML = (Array.isArray(episodes) ? episodes : []).map((ep, i) => {
    const num = ep.number || i + 1;
    const hasScript = State.scripts && State.scripts[num];
    return `
      <button class="episode-tab ${num === currentScriptEpisode ? 'episode-tab--active' : ''} ${hasScript ? 'episode-tab--done' : ''}"
        onclick="selectScriptEpisode(${num})">
        <span class="episode-tab__num">EP ${num}</span>
        <span class="episode-tab__title">${ep.title || ''}</span>
        ${hasScript ? '<span class="episode-tab__check">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Sélectionne un épisode et affiche/génère son script
 * @param {number} episodeNum — numéro de l'épisode (1-5)
 */
function selectScriptEpisode(episodeNum) {
  currentScriptEpisode = episodeNum;
  renderScriptTabs();

  // Si le script existe déjà, l'afficher
  if (State.scripts && State.scripts[episodeNum]) {
    displayScript(State.scripts[episodeNum]);
    return;
  }

  // Sinon, le générer
  generateScript(episodeNum);
}

/**
 * Génère le script détaillé d'un épisode via Claude
 * @param {number} episodeNum — numéro de l'épisode
 */
async function generateScript(episodeNum) {
  const resultEl = document.getElementById('screen-5-result');
  resultEl.style.display = 'none';

  showLoading('screen-5-loading', 'claude', {
    message: `Écriture du script — Épisode ${episodeNum}…`,
  });

  try {
    const prompt = buildScriptPrompt(episodeNum);
    const result = await callClaude(prompt);
    const script = parseJSONResponse(result);

    // Sauvegarder
    if (!State.scripts) State.scripts = {};
    State.scripts[episodeNum] = script;
    State.save();

    renderScriptTabs();
    displayScript(script);

    // Activer le bouton Continuer quand tous les scripts sont faits
    checkAllScriptsDone();

  } catch (err) {
    hideLoading('screen-5-loading');
    const resultEl = document.getElementById('screen-5-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div class="card"><p class="status--error">Erreur : ${err.message}</p>
      <button class="btn btn--primary" onclick="generateScript(${episodeNum})" style="margin-top:16px">Réessayer</button></div>`;
  }
}

/**
 * Construit le prompt de script détaillé pour un épisode
 * @param {number} episodeNum — numéro de l'épisode
 * @returns {string}
 */
function buildScriptPrompt(episodeNum) {
  const canonJSON = JSON.stringify(State.idIP, null, 2);
  const episodes = State.episodes || [];
  const episode = (Array.isArray(episodes) ? episodes : []).find(e => (e.number || 0) === episodeNum) || episodes[episodeNum - 1];
  const episodeJSON = JSON.stringify(episode, null, 2);

  const formatContext = AppState.mode === 'podcast'
    ? `Format : WEBTOON — chaque sous-scène = 1 panneau de bande dessinée vertical.
Inclure des DIALOGUES sous forme de bulles (citations réelles du podcast).
Indiquer le placement des personnages et les expressions faciales.`
    : `Format : MICRO-DRAMA VIDÉO — chaque sous-scène = 1 clip de ~15 secondes.
Décrire les MOUVEMENTS de caméra, les transitions, l'ambiance sonore.
Indiquer les dialogues (voix-off ou sous-titres).`;

  return `Tu es un scénariste professionnel. Écris le script détaillé de l'épisode ${episodeNum} avec exactement 3 SOUS-SCÈNES.

CANON IP (à respecter STRICTEMENT) :
${canonJSON}

ÉPISODE À DÉTAILLER :
${episodeJSON}

${formatContext}

RÈGLES :
- Exactement 3 sous-scènes
- Chaque sous-scène doit être autonome visuellement
- Descriptions visuelles TRÈS détaillées (pour génération d'image/vidéo)
- Dialogues fidèles au ID IP
- Rester FIDÈLE au ton et aux contraintes du canon

FORMAT DE RÉPONSE (JSON strict) :
{
  "episodeNumber": ${episodeNum},
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Titre de la sous-scène",
      "visualDescription": "Description visuelle ultra-détaillée (décor, personnages, lumière, cadrage, couleurs)",
      "dialogue": [
        { "speaker": "Nom", "text": "Réplique" }
      ],
      "mood": "Ambiance et émotion de la scène",
      "cameraNote": "Indication de cadrage/mouvement (plan large, gros plan, panoramique…)",
      "duration": "~15 secondes"
    }
  ]
}`;
}

/**
 * Affiche le script d'un épisode dans le DOM
 * @param {Object} script — données du script
 */
function displayScript(script) {
  hideLoading('screen-5-loading');

  const resultEl = document.getElementById('screen-5-result');
  resultEl.style.display = 'block';

  const scenesEl = document.getElementById('script-scenes');
  scenesEl.innerHTML = (script.scenes || []).map((scene, i) => `
    <div class="scene-card">
      <div class="scene-card__header">
        <span class="scene-card__number">Scène ${scene.sceneNumber || i + 1}</span>
        <h3 class="scene-card__title">${scene.title || ''}</h3>
        <span class="scene-card__duration">${scene.duration || '~15s'}</span>
      </div>

      <div class="scene-card__section">
        <h4 class="scene-card__label">Description visuelle</h4>
        <p class="scene-card__text">${scene.visualDescription || ''}</p>
      </div>

      <div class="scene-card__section">
        <h4 class="scene-card__label">Dialogues</h4>
        <div class="scene-card__dialogues">
          ${(scene.dialogue || []).map(d => `
            <div class="dialogue-line">
              <span class="dialogue-line__speaker">${d.speaker}</span>
              <span class="dialogue-line__text">"${d.text}"</span>
            </div>
          `).join('')}
          ${(scene.dialogue || []).length === 0 ? '<p class="scene-card__text--muted">Pas de dialogue</p>' : ''}
        </div>
      </div>

      <div class="scene-card__footer">
        <span class="scene-card__mood">${scene.mood || ''}</span>
        <span class="scene-card__camera">${scene.cameraNote || ''}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Régénère le script de l'épisode actuellement sélectionné
 */
function regenerateCurrentScript() {
  if (State.scripts) {
    delete State.scripts[currentScriptEpisode];
    State.save();
  }
  generateScript(currentScriptEpisode);
}

/**
 * Vérifie si tous les épisodes ont un script et active le bouton Continuer
 */
function checkAllScriptsDone() {
  const episodes = State.episodes || [];
  const total = Array.isArray(episodes) ? episodes.length : 0;
  let done = 0;

  for (let i = 1; i <= total; i++) {
    if (State.scripts && State.scripts[i]) done++;
  }

  // Activer le bouton dès que l'épisode 1 est fait (les autres peuvent être générés plus tard)
  if (done >= 1) {
    document.getElementById('btn-next-screen5').disabled = false;
  }
}

/**
 * Initialisation de l'application au chargement de la page
 */
function initApp() {
  // Restaurer l'état sauvegardé
  AppState.load();
  State.load();

  // Initialiser le stepper
  if (typeof initStepper === 'function') {
    initStepper(SCREENS, AppState);
  }

  // Restore screen-0 selection state
  if (AppState.mode) {
    const el = document.getElementById(`mode-${AppState.mode}`);
    if (el) el.classList.add('mode-card--selected');
  }
  if (AppState.outputFormat) {
    const el = document.getElementById(`output-${AppState.outputFormat}`);
    if (el) el.classList.add('format-card--selected');
  }
  checkStartReady();

  // Navigation par hash dans l'URL
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    navigateTo(hash);
  } else {
    navigateTo(AppState.currentScreen);
  }
}

// Écouter les changements de hash (bouton retour du navigateur)
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && hash !== AppState.currentScreen) {
    navigateTo(hash);
  }
});

// Lancer l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', initApp);
