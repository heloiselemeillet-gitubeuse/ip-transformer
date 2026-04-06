// ffmpeg-engine.js — Moteur d'assemblage vidéo via ffmpeg.wasm v0.12.x
// Ken Burns (zoom/pan sur image), xfade transitions, mix musique
// DESKTOP UNIQUEMENT — progress bar % réel

/** Instance FFmpeg singleton */
let ffmpegInstance = null;
let ffmpegLoaded = false;

/**
 * Charge ffmpeg.wasm (une seule fois)
 * @param {Function} onProgress — callback(percent) pour la progression du chargement
 * @returns {Promise<Object>} — instance FFmpeg
 */
async function loadFFmpeg(onProgress) {
  if (ffmpegLoaded && ffmpegInstance) return ffmpegInstance;

  // Import dynamique de ffmpeg.wasm v0.12.x depuis CDN
  const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
  const { fetchFile, toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');

  ffmpegInstance = new FFmpeg();

  // Écouter la progression
  ffmpegInstance.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.round(progress * 100));
  });

  // Écouter les logs (debug)
  ffmpegInstance.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);
  });

  // Charger le core depuis CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegLoaded = true;
  // Stocker fetchFile pour usage ultérieur
  ffmpegInstance._fetchFile = fetchFile;
  return ffmpegInstance;
}

/**
 * Génère un clip Ken Burns (zoom/pan) à partir d'une image fixe
 * @param {Object} params
 * @param {ArrayBuffer} params.imageData — données de l'image source
 * @param {string} params.direction — 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'
 * @param {number} params.duration — durée en secondes (défaut 15)
 * @param {number} params.width — largeur sortie (défaut 720)
 * @param {number} params.height — hauteur sortie (défaut 1280)
 * @returns {Promise<Blob>} — blob vidéo MP4
 */
async function generateKenBurnsVideo(params) {
  const ffmpeg = await loadFFmpeg();
  const fetchFile = ffmpeg._fetchFile;

  const duration = params.duration || 15;
  const w = params.width || 720;
  const h = params.height || 1280;
  const dir = params.direction || 'zoom-in';

  // Écrire l'image source dans le FS virtuel
  await ffmpeg.writeFile('input.png', await fetchFile(new Blob([params.imageData])));

  // Construire le filtre zoompan selon la direction
  const filter = buildKenBurnsFilter(dir, duration, w, h);

  // Exécuter ffmpeg
  await ffmpeg.exec([
    '-loop', '1',
    '-i', 'input.png',
    '-vf', filter,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '24',
    '-y', 'output.mp4',
  ]);

  // Lire le résultat
  const data = await ffmpeg.readFile('output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Construit le filtre zoompan ffmpeg selon la direction
 * @param {string} direction — type de mouvement
 * @param {number} duration — durée en secondes
 * @param {number} w — largeur
 * @param {number} h — hauteur
 * @returns {string} — chaîne de filtre ffmpeg
 */
function buildKenBurnsFilter(direction, duration, w, h) {
  const totalFrames = duration * 24;

  switch (direction) {
    case 'zoom-in':
      return `zoompan=z='min(zoom+0.002,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=24`;
    case 'zoom-out':
      return `zoompan=z='if(eq(on,1),1.5,max(zoom-0.002,1))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=24`;
    case 'pan-left':
      return `zoompan=z='1.2':x='iw*0.2-on*(iw*0.2/${totalFrames})':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=24`;
    case 'pan-right':
      return `zoompan=z='1.2':x='on*(iw*0.2/${totalFrames})':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=24`;
    case 'pan-up':
      return `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='ih*0.2-on*(ih*0.2/${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=24`;
    case 'pan-down':
      return `zoompan=z='1.2':x='iw/2-(iw/zoom/2)':y='on*(ih*0.2/${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=24`;
    default:
      return `zoompan=z='min(zoom+0.002,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=24`;
  }
}

/**
 * Assemble 3 clips vidéo avec transitions xfade pour un épisode
 * @param {Object} params
 * @param {Array<Blob>} params.clips — 3 blobs vidéo MP4
 * @param {number} params.transitionDuration — durée transition en secondes (défaut 1)
 * @param {string} params.transitionType — type xfade (défaut 'fade')
 * @returns {Promise<Blob>} — blob vidéo assemblée MP4
 */
async function assembleEpisode(params) {
  const ffmpeg = await loadFFmpeg();
  const fetchFile = ffmpeg._fetchFile;

  const clips = params.clips;
  const transDur = params.transitionDuration || 1;
  const transType = params.transitionType || 'fade';

  if (clips.length !== 3) {
    throw new Error('Exactement 3 clips requis pour l\'assemblage');
  }

  // Écrire les 3 clips dans le FS virtuel
  for (let i = 0; i < clips.length; i++) {
    await ffmpeg.writeFile(`clip${i}.mp4`, await fetchFile(clips[i]));
  }

  // Assemblage avec xfade entre chaque clip
  // clip0 + clip1 → temp01, puis temp01 + clip2 → final
  await ffmpeg.exec([
    '-i', 'clip0.mp4',
    '-i', 'clip1.mp4',
    '-filter_complex',
    `[0:v][1:v]xfade=transition=${transType}:duration=${transDur}:offset=14[v01]`,
    '-map', '[v01]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-y', 'temp01.mp4',
  ]);

  await ffmpeg.exec([
    '-i', 'temp01.mp4',
    '-i', 'clip2.mp4',
    '-filter_complex',
    `[0:v][1:v]xfade=transition=${transType}:duration=${transDur}:offset=28[vfinal]`,
    '-map', '[vfinal]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-y', 'assembled.mp4',
  ]);

  const data = await ffmpeg.readFile('assembled.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Mixe une musique d'ambiance avec une vidéo assemblée
 * @param {Object} params
 * @param {Blob} params.videoBlob — vidéo assemblée
 * @param {ArrayBuffer} params.musicData — données audio MP3
 * @param {number} params.musicVolume — volume musique 0.0-1.0 (défaut 0.3)
 * @param {number} params.fadeOutDuration — durée du fade out final en secondes (défaut 3)
 * @returns {Promise<Blob>} — blob vidéo finale avec musique
 */
async function mixMusic(params) {
  const ffmpeg = await loadFFmpeg();
  const fetchFile = ffmpeg._fetchFile;

  const fadeOut = params.fadeOutDuration || 3;
  const volume = params.musicVolume || 0.3;

  // Écrire les fichiers
  await ffmpeg.writeFile('video.mp4', await fetchFile(params.videoBlob));
  await ffmpeg.writeFile('music.mp3', await fetchFile(new Blob([params.musicData])));

  // Obtenir la durée de la vidéo (approximation basée sur 3 clips × 15s - 2 transitions)
  const videoDuration = 43; // ~45s - 2s de transitions

  // Mixer : trim la musique à la durée vidéo + fade out
  await ffmpeg.exec([
    '-i', 'video.mp4',
    '-i', 'music.mp3',
    '-filter_complex',
    `[1:a]atrim=0:${videoDuration},afade=t=out:st=${videoDuration - fadeOut}:d=${fadeOut},volume=${volume}[music];[music]apad[aout]`,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-y', 'final.mp4',
  ]);

  const data = await ffmpeg.readFile('final.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Pipeline complet d'assemblage d'un épisode
 * 1. Prépare les clips (Ken Burns si nécessaire)
 * 2. Assemble les 3 clips avec xfade
 * 3. Mixe la musique d'ambiance
 * @param {Object} params
 * @param {number} params.episodeNum — numéro de l'épisode
 * @param {Function} params.onProgress — callback({ step, percent, message })
 * @returns {Promise<Blob>} — vidéo finale MP4
 */
async function assembleFullEpisode(params) {
  const { episodeNum, onProgress } = params;

  const report = (step, percent, message) => {
    if (onProgress) onProgress({ step, percent, message });
  };

  // Étape 1 : Charger ffmpeg
  report('load', 0, 'Chargement de ffmpeg.wasm…');
  await loadFFmpeg((p) => report('load', p, 'Chargement de ffmpeg.wasm…'));

  // Étape 2 : Préparer les 3 clips
  report('clips', 0, 'Préparation des clips…');
  const clipBlobs = [];
  const clips = State.generatedClips[episodeNum] || {};

  for (let sceneNum = 1; sceneNum <= 3; sceneNum++) {
    const clip = clips[sceneNum];
    if (!clip) throw new Error(`Clip scène ${sceneNum} non trouvé`);

    report('clips', Math.round((sceneNum - 1) / 3 * 100), `Préparation clip ${sceneNum}/3…`);

    if (clip.isKenBurns) {
      // Générer le clip Ken Burns depuis l'image
      const imgData = await dbGet(STORES.IMAGES, `ep${episodeNum}-scene${sceneNum}`);
      if (!imgData) throw new Error(`Image scène ${sceneNum} non trouvée en local`);

      const kbBlob = await generateKenBurnsVideo({
        imageData: imgData.data,
        direction: clip.kbDirection || 'zoom-in',
        duration: 15,
      });
      clipBlobs.push(kbBlob);
    } else {
      // Clip Wan : récupérer depuis IndexedDB ou URL
      const videoData = await dbGet(STORES.VIDEOS, `ep${episodeNum}-scene${sceneNum}`);
      if (videoData) {
        clipBlobs.push(new Blob([videoData.data], { type: 'video/mp4' }));
      } else if (clip.url) {
        const resp = await fetch(clip.url);
        clipBlobs.push(await resp.blob());
      } else {
        throw new Error(`Clip scène ${sceneNum} introuvable`);
      }
    }
  }

  // Étape 3 : Assembler les 3 clips
  report('assemble', 0, 'Assemblage des 3 clips avec transitions…');
  const assembled = await assembleEpisode({
    clips: clipBlobs,
    transitionDuration: 1,
    transitionType: 'fade',
  });

  // Étape 4 : Mixer la musique
  report('music', 0, 'Mixage de la musique d\'ambiance…');

  const musicTrack = getMusicTrack(State.selectedMusic);
  if (musicTrack) {
    try {
      // Charger le fichier musique
      const musicResp = await fetch(`assets/music/${musicTrack.file}`);
      const musicBuffer = await musicResp.arrayBuffer();

      const final = await mixMusic({
        videoBlob: assembled,
        musicData: musicBuffer,
        musicVolume: 0.3,
        fadeOutDuration: 3,
      });

      report('done', 100, 'Assemblage terminé !');
      return final;
    } catch (e) {
      console.warn('Échec du mix musique, retour vidéo sans musique', e);
      report('done', 100, 'Assemblage terminé (sans musique)');
      return assembled;
    }
  }

  report('done', 100, 'Assemblage terminé !');
  return assembled;
}

/**
 * Vérifie si l'environnement supporte ffmpeg.wasm (desktop uniquement)
 * @returns {boolean}
 */
function isFFmpegSupported() {
  // Vérifier SharedArrayBuffer (requis par ffmpeg.wasm)
  return typeof SharedArrayBuffer !== 'undefined';
}
