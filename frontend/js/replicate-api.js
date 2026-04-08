// replicate-api.js — Module polling Replicate côté client
// Le Worker ne poll JAMAIS Replicate (timeout 30s)
// C'est le FRONTEND qui poll toutes les 5s

/** URL du Worker Replicate Proxy */
const REPLICATE_WORKER = API_CONFIG
  ? API_CONFIG.replicateProxy
  : (window.location.hostname === 'localhost' ? 'http://localhost:8788' : 'https://replicate-proxy.ip-transformer.workers.dev');

/** Timeout max pour une prédiction (5 minutes) */
const REPLICATE_TIMEOUT = 5 * 60 * 1000;

/** Intervalle de polling (5 secondes) */
const REPLICATE_POLL_INTERVAL = 5000;

/**
 * Lance une prédiction Flux Redux pour générer une image
 * @param {Object} params — paramètres de la prédiction
 * @param {string} params.prompt — description de l'image
 * @param {string} params.imageRef — image de référence en base64 (pour Redux)
 * @param {number} params.width — largeur (défaut 720)
 * @param {number} params.height — hauteur (défaut 1280 pour 9:16)
 * @returns {Promise<string>} — prediction_id
 */
async function replicateStartFluxRedux(params) {
  // Si pas d'image de référence, utiliser flux-schnell (text-to-image)
  // Sinon utiliser flux-redux-dev (image + text)
  const hasImageRef = !!params.imageRef;
  const model = hasImageRef ? 'flux-redux-dev' : 'flux-schnell';

  // Calculer l'aspect ratio pour flux-schnell (pas de width/height)
  const w = params.width || 720;
  const h = params.height || 1280;
  const aspectRatio = w === h ? '1:1' : (w > h ? '16:9' : '9:16');

  const input = hasImageRef
    ? {
        prompt: params.prompt,
        image: `data:image/png;base64,${params.imageRef}`,
        width: w,
        height: h,
        num_outputs: 1,
        guidance_scale: 3.5,
      }
    : {
        prompt: params.prompt,
        aspect_ratio: aspectRatio,
        num_outputs: 1,
        output_format: 'webp',
      };

  const response = await fetch(`${REPLICATE_WORKER}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Erreur Replicate : ${response.status} — ${errBody}`);
  }

  const data = await response.json();
  return data.prediction_id || data.id;
}

/**
 * Lance une prédiction Wan 2.1 pour générer un clip vidéo
 * @param {Object} params — paramètres
 * @param {string} params.prompt — description de la scène
 * @param {string} params.imageRef — image de départ en base64
 * @param {number} params.duration — durée en secondes (défaut 15)
 * @returns {Promise<string>} — prediction_id
 */
async function replicateStartWan(params) {
  const response = await fetch(`${REPLICATE_WORKER}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'wan-2.1',
      input: {
        prompt: params.prompt,
        image: params.imageRef ? `data:image/png;base64,${params.imageRef}` : undefined,
        num_frames: Math.round((params.duration || 15) * 24),
        width: 720,
        height: 1280,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Erreur Replicate Wan : ${response.status}`);
  }

  const data = await response.json();
  return data.prediction_id || data.id;
}

/**
 * Vérifie le statut d'une prédiction via le Worker
 * @param {string} predictionId — id de la prédiction
 * @returns {Promise<Object>} — { status, output, error, logs }
 */
async function replicateCheckStatus(predictionId) {
  const response = await fetch(`${REPLICATE_WORKER}/status/${predictionId}`);

  if (!response.ok) {
    throw new Error(`Erreur statut : ${response.status}`);
  }

  return response.json();
}

/**
 * Poll une prédiction jusqu'à complétion avec callback de progression
 * Timeout après 5 minutes
 * @param {string} predictionId — id de la prédiction
 * @param {Function} onProgress — callback({ status, logs, percent })
 * @returns {Promise<Object>} — résultat final { output }
 */
function replicatePoll(predictionId, onProgress) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const timer = setInterval(async () => {
      // Vérifier le timeout
      if (Date.now() - startTime > REPLICATE_TIMEOUT) {
        clearInterval(timer);
        reject(new Error('Timeout — la génération a pris plus de 5 minutes'));
        return;
      }

      try {
        const result = await replicateCheckStatus(predictionId);

        // Estimer le pourcentage depuis les logs
        let percent = 0;
        if (result.status === 'starting') percent = 10;
        if (result.status === 'processing') percent = 50;
        if (result.status === 'succeeded') percent = 100;

        if (onProgress) {
          onProgress({
            status: result.status,
            logs: result.logs || '',
            percent,
          });
        }

        if (result.status === 'succeeded') {
          clearInterval(timer);
          resolve(result);
        } else if (result.status === 'failed' || result.status === 'canceled') {
          clearInterval(timer);
          reject(new Error(result.error || 'Génération échouée'));
        }
        // 'starting' ou 'processing' → on continue
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, REPLICATE_POLL_INTERVAL);
  });
}

/**
 * Génère une image complète : lance + poll + retourne l'URL
 * @param {Object} params — paramètres Flux Redux
 * @param {Function} onProgress — callback de progression
 * @returns {Promise<string>} — URL de l'image générée
 */
async function replicateGenerateImage(params, onProgress) {
  const predictionId = await replicateStartFluxRedux(params);

  const result = await replicatePoll(predictionId, onProgress);

  // Extraire l'URL de l'image depuis output
  const output = result.output;
  if (Array.isArray(output)) return output[0];
  if (typeof output === 'string') return output;
  throw new Error('Format de sortie Replicate inattendu');
}
