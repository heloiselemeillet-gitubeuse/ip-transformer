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
 * Lance ou arrête la preview audio d'une track
 * @param {string} trackId — id de la track
 */
function toggleMusicPreview(trackId) {
  // Si c'est la même track, toggle pause/play
  if (currentPreviewTrackId === trackId && currentPreviewAudio) {
    if (currentPreviewAudio.paused) {
      currentPreviewAudio.play();
    } else {
      currentPreviewAudio.pause();
      currentPreviewAudio = null;
      currentPreviewTrackId = null;
    }
    return;
  }

  // Arrêter la lecture en cours
  stopMusicPreview();

  // Trouver la track
  const track = MUSIC_LIBRARY.find(t => t.id === trackId);
  if (!track) return;

  // Lancer la lecture
  currentPreviewAudio = new Audio(`assets/music/${track.file}`);
  currentPreviewTrackId = trackId;
  currentPreviewAudio.volume = 0.5;
  currentPreviewAudio.play().catch(() => {
    // Fichier non trouvé — pas d'erreur bloquante (POC)
    console.warn(`Fichier musique non trouvé : ${track.file}`);
    currentPreviewAudio = null;
    currentPreviewTrackId = null;
  });

  // Arrêter à la fin
  currentPreviewAudio.addEventListener('ended', () => {
    currentPreviewAudio = null;
    currentPreviewTrackId = null;
  });
}

/**
 * Arrête la preview audio en cours
 */
function stopMusicPreview() {
  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
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
