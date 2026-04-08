// music.js — Sélection musique d'ambiance + preview audio
// Bibliothèque de tracks libres de droits intégrée

/**
 * Catalogue de musiques d'ambiance
 * Les fichiers MP3 seront dans frontend/assets/music/
 * Pour le POC, on utilise des placeholders (les fichiers seront ajoutés plus tard)
 */
const MUSIC_LIBRARY = [
  { id: 'epic', label: 'Épique', file: 'epic.mp3', mood: 'Grandiose, héroïque, montée en puissance' },
  { id: 'tension', label: 'Tension', file: 'tension.mp3', mood: 'Suspense, mystère, anticipation' },
  { id: 'melancholy', label: 'Mélancolie', file: 'melancholy.mp3', mood: 'Triste, nostalgique, émouvant' },
  { id: 'joyful', label: 'Joyeux', file: 'joyful.mp3', mood: 'Léger, optimiste, entraînant' },
  { id: 'mysterious', label: 'Mystérieux', file: 'mysterious.mp3', mood: 'Énigmatique, atmosphérique, intrigant' },
  { id: 'calm', label: 'Calme', file: 'calm.mp3', mood: 'Paisible, contemplatif, doux' },
  { id: 'dramatic', label: 'Dramatique', file: 'dramatic.mp3', mood: 'Intense, conflictuel, puissant' },
  { id: 'urban', label: 'Urbain', file: 'urban.mp3', mood: 'Moderne, rythmé, street' },
  { id: 'nature', label: 'Nature', file: 'nature.mp3', mood: 'Organique, ambiant, paisible' },
  { id: 'minimal', label: 'Minimaliste', file: 'minimal.mp3', mood: 'Épuré, subtil, élégant' },
];

/** Audio actuellement en lecture pour la preview */
let currentPreviewAudio = null;
let currentPreviewTrackId = null;

/**
 * Affiche le sélecteur de musique dans un conteneur
 * @param {string} containerId — id du conteneur DOM
 * @param {string} selectedId — id de la track sélectionnée
 * @param {Function} onSelect — callback(trackId) quand l'utilisateur sélectionne
 */
function renderMusicSelector(containerId, selectedId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = MUSIC_LIBRARY.map(track => `
    <div class="music-track ${selectedId === track.id ? 'music-track--selected' : ''}"
         data-track="${track.id}">
      <button class="music-track__play" onclick="event.stopPropagation(); toggleMusicPreview('${track.id}')">
        ${currentPreviewTrackId === track.id ? '⏸' : '▶'}
      </button>
      <div class="music-track__info" onclick="selectMusicTrack('${track.id}', '${containerId}')">
        <span class="music-track__label">${track.label}</span>
        <span class="music-track__mood">${track.mood}</span>
      </div>
      <div class="music-track__check">
        ${selectedId === track.id ? '✓' : ''}
      </div>
    </div>
  `).join('');

  // Stocker le callback pour la sélection
  container._onSelect = onSelect;
}

/**
 * Sélectionne une track de musique
 * @param {string} trackId — id de la track
 * @param {string} containerId — id du conteneur
 */
function selectMusicTrack(trackId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Re-render avec la nouvelle sélection
  const onSelect = container._onSelect;
  renderMusicSelector(containerId, trackId, onSelect);

  // Appeler le callback
  if (onSelect) onSelect(trackId);
}

/**
 * Génère un son synthétique via Web Audio API pour la preview
 * Chaque ambiance a un pattern sonore distinct
 */
function generateMusicPreview(trackId) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.15;
  gainNode.connect(ctx.destination);

  // Patterns sonores par ambiance
  const patterns = {
    epic: { freq: [220, 330, 440, 550], type: 'sawtooth', tempo: 0.4 },
    tension: { freq: [150, 160, 170, 180], type: 'sine', tempo: 0.6 },
    melancholy: { freq: [262, 294, 330, 294], type: 'sine', tempo: 0.8 },
    joyful: { freq: [330, 392, 440, 494], type: 'triangle', tempo: 0.3 },
    mysterious: { freq: [196, 233, 220, 261], type: 'sine', tempo: 0.7 },
    calm: { freq: [262, 330, 392, 330], type: 'sine', tempo: 1.0 },
    dramatic: { freq: [196, 246, 293, 196], type: 'sawtooth', tempo: 0.5 },
    urban: { freq: [330, 370, 440, 370], type: 'square', tempo: 0.25 },
    nature: { freq: [392, 440, 494, 440], type: 'sine', tempo: 0.9 },
    minimal: { freq: [440, 440, 523, 440], type: 'sine', tempo: 1.2 },
  };

  const pattern = patterns[trackId] || patterns.calm;
  const notes = pattern.freq;
  const duration = 4; // 4 secondes de preview

  for (let i = 0; i < duration / pattern.tempo; i++) {
    const osc = ctx.createOscillator();
    osc.type = pattern.type;
    osc.frequency.value = notes[i % notes.length];

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, ctx.currentTime + i * pattern.tempo);
    noteGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * pattern.tempo + 0.05);
    noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * pattern.tempo + pattern.tempo * 0.8);

    osc.connect(noteGain);
    noteGain.connect(gainNode);

    osc.start(ctx.currentTime + i * pattern.tempo);
    osc.stop(ctx.currentTime + i * pattern.tempo + pattern.tempo);
  }

  // Retourner le contexte pour pouvoir l'arrêter
  return { ctx, duration };
}

/** Timeout pour arrêter la preview */
let previewTimeout = null;

/**
 * Lance ou arrête la preview audio d'une track
 * @param {string} trackId — id de la track
 */
function toggleMusicPreview(trackId) {
  // Si c'est la même track, arrêter
  if (currentPreviewTrackId === trackId && currentPreviewAudio) {
    stopMusicPreview();
    // Re-render pour mettre à jour l'icône
    renderMusicSelector('music-selector', State.selectedMusic, (id) => {
      State.selectedMusic = id;
      State.save();
      checkScreen9Ready();
    });
    return;
  }

  // Arrêter la lecture en cours
  stopMusicPreview();

  // Générer la preview synthétique
  const preview = generateMusicPreview(trackId);
  currentPreviewAudio = preview.ctx;
  currentPreviewTrackId = trackId;

  // Re-render pour mettre à jour l'icône ▶ → ⏸
  renderMusicSelector('music-selector', State.selectedMusic, (id) => {
    State.selectedMusic = id;
    State.save();
    checkScreen9Ready();
  });

  // Arrêter automatiquement après la durée
  previewTimeout = setTimeout(() => {
    stopMusicPreview();
    renderMusicSelector('music-selector', State.selectedMusic, (id) => {
      State.selectedMusic = id;
      State.save();
      checkScreen9Ready();
    });
  }, preview.duration * 1000 + 200);
}

/**
 * Arrête la preview audio en cours
 */
function stopMusicPreview() {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  if (currentPreviewAudio) {
    // Fermer le contexte Web Audio
    if (currentPreviewAudio.close) {
      currentPreviewAudio.close();
    } else if (currentPreviewAudio.pause) {
      currentPreviewAudio.pause();
    }
    currentPreviewAudio = null;
    currentPreviewTrackId = null;
  }
}

/**
 * Retourne les infos d'une track par son id
 * @param {string} trackId
 * @returns {Object|null}
 */
function getMusicTrack(trackId) {
  return MUSIC_LIBRARY.find(t => t.id === trackId) || null;
}
