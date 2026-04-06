// api.js — Communication avec les Workers (proxy sécurisé)
// Jamais de clé API dans le frontend — tout passe par les Workers

/**
 * URLs des Workers (à configurer selon l'environnement)
 * En dev : localhost, en prod : domaines Cloudflare Workers
 */
const API_CONFIG = {
  // Détecter automatiquement l'environnement
  isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',

  get apiProxy() {
    return this.isDev ? 'http://localhost:8787' : 'https://api-proxy.ip-transformer.workers.dev';
  },
  get replicateProxy() {
    return this.isDev ? 'http://localhost:8788' : 'https://replicate-proxy.ip-transformer.workers.dev';
  },
  get youtubeProxy() {
    return this.isDev ? 'http://localhost:8789' : 'https://youtube-proxy.ip-transformer.workers.dev';
  },
};

/**
 * Appel à Claude API via le Worker api-proxy
 * @param {string} prompt — le prompt à envoyer
 * @param {Object} options — options supplémentaires
 * @param {Array} options.images — images en base64 pour Claude Vision
 * @returns {Promise<Object>} — réponse de Claude
 */
async function callClaude(prompt, options = {}) {
  const body = {
    prompt,
    images: options.images || [],
  };

  const response = await fetch(`${API_CONFIG.apiProxy}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Erreur Claude API : ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Lance une prédiction Replicate via le Worker replicate-proxy
 * Retourne immédiatement un prediction_id (pas de polling côté Worker)
 * @param {string} model — identifiant du modèle (ex: 'flux-redux-dev')
 * @param {Object} input — paramètres du modèle
 * @returns {Promise<Object>} — { prediction_id }
 */
async function startReplicate(model, input) {
  const response = await fetch(`${API_CONFIG.replicateProxy}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    throw new Error(`Erreur Replicate : ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Vérifie le statut d'une prédiction Replicate
 * Le frontend poll cette route toutes les 5 secondes
 * @param {string} predictionId — id de la prédiction
 * @returns {Promise<Object>} — { status, output, error }
 */
async function checkReplicateStatus(predictionId) {
  const response = await fetch(`${API_CONFIG.replicateProxy}/status/${predictionId}`);

  if (!response.ok) {
    throw new Error(`Erreur statut Replicate : ${response.status}`);
  }

  return response.json();
}

/**
 * Poll une prédiction Replicate jusqu'à complétion
 * Appelle un callback à chaque vérification pour mettre à jour l'UI
 * @param {string} predictionId — id de la prédiction
 * @param {Function} onProgress — callback(status) à chaque poll
 * @param {number} interval — intervalle de polling en ms (défaut 5000)
 * @returns {Promise<Object>} — résultat final de la prédiction
 */
async function pollReplicate(predictionId, onProgress, interval = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const result = await checkReplicateStatus(predictionId);

        // Callback de progression
        if (onProgress) onProgress(result);

        if (result.status === 'succeeded') {
          clearInterval(timer);
          resolve(result);
        } else if (result.status === 'failed' || result.status === 'canceled') {
          clearInterval(timer);
          reject(new Error(result.error || 'Prédiction échouée'));
        }
        // Sinon : 'starting' ou 'processing' → on continue le polling
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, interval);
  });
}

/**
 * Extraction du transcript YouTube via le Worker youtube-proxy
 * @param {string} youtubeUrl — URL de la vidéo YouTube
 * @returns {Promise<Object>} — { transcript, source, title }
 */
async function fetchYoutubeTranscript(youtubeUrl) {
  const response = await fetch(`${API_CONFIG.youtubeProxy}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: youtubeUrl }),
  });

  if (!response.ok) {
    throw new Error(`Erreur YouTube transcript : ${response.status}`);
  }

  return response.json();
}
