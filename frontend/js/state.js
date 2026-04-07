// state.js — Gestion d'état centralisée (localStorage)
// Stocke les données légères : navigation, choix, textes, canon IP

const STATE_KEY = 'ip-transformer-state';

/**
 * État global de l'application
 * Toutes les données légères sont centralisées ici
 */
const State = {
  // Navigation
  currentScreen: 'screen-0',
  mode: null,             // 'podcast' ou 'peinture'
  outputFormat: null,     // 'webtoon', 'micro-drama' ou 'both'

  // Écran 1 — Asset Loader
  youtubeUrl: null,       // Lien YouTube (mode podcast)
  transcriptText: null,   // Texte du transcript (mode podcast)
  transcriptSource: null, // 'youtube-subs', 'whisper' ou 'file-upload'
  paintingCount: 0,       // Nombre d'œuvres uploadées (mode peinture)

  // Écran 2 — Analyse
  analysis: null,         // Résultat de l'analyse IA

  // Écran 3b — ID IP (includes synopsis, arcs, characters, style)
  idIP: null,          // Bible de marque / verrou de fidélité

  // Écran 4 — Épisodes
  episodes: null,         // Découpage en 5 épisodes

  // Écran 5 — Scripts
  scripts: null,          // Scripts détaillés par épisode

  // Style visuel (set from screen-3b)
  visualStyle: null,      // { styleId, styleLabel, stylePrompt, temperature, contrast }

  // Écran 7 — Images générées
  generatedImages: null,  // { [episodeNum]: [{ url, status, sceneIndex, prompt }] }

  // Écran 9 — Config animation
  animationConfig: null,  // { [episodeNum]: { [sceneNum]: { type, kbDirection } } }
  selectedMusic: null,    // id de la track musicale choisie

  // Écran 10 — Clips vidéo générés
  generatedClips: null,   // { [episodeNum]: { [sceneNum]: { status, url, isKenBurns, kbDirection } } }

  // Écran 13 — Webtoon
  webtoonData: null,      // { [episodeNum]: { panels, gutterSize } }
  webtoonGutter: 30,      // taille gouttière par défaut (px)

  /**
   * Sauvegarde l'état complet dans localStorage
   */
  save() {
    const data = {};
    // Copier toutes les propriétés non-fonctions
    for (const key of Object.keys(this)) {
      if (typeof this[key] !== 'function') {
        data[key] = this[key];
      }
    }
    localStorage.setItem(STATE_KEY, JSON.stringify(data));
  },

  /**
   * Restaure l'état depuis localStorage
   */
  load() {
    const saved = localStorage.getItem(STATE_KEY);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      for (const key of Object.keys(data)) {
        if (key in this && typeof this[key] !== 'function') {
          this[key] = data[key];
        }
      }
    } catch (e) {
      console.warn('État corrompu, réinitialisation.', e);
    }
  },

  /**
   * Réinitialise l'état complet
   */
  reset() {
    localStorage.removeItem(STATE_KEY);
    this.currentScreen = 'screen-0';
    this.mode = null;
    this.outputFormat = null;
    this.youtubeUrl = null;
    this.transcriptText = null;
    this.transcriptSource = null;
    this.paintingCount = 0;
    this.analysis = null;
    this.idIP = null;
    this.episodes = null;
    this.scripts = null;
    this.visualStyle = null;
    this.generatedImages = null;
    this.animationConfig = null;
    this.selectedMusic = null;
    this.generatedClips = null;
    this.webtoonData = null;
    this.webtoonGutter = 30;
  },
};
