// Worker Replicate Proxy — Flux Redux, Wan 2.1, Whisper
// JAMAIS de polling dans ce Worker (timeout 30s Cloudflare)
// Le frontend poll GET /status/:id toutes les 5s

// Modèles Replicate supportés
const MODELS = {
  'flux-redux-dev': 'black-forest-labs/flux-redux-dev',
  'wan-2.1': 'wan-ai/wan2.1-t2v-14b',
  'whisper': 'openai/whisper',
};

// Origins autorisés (CORS)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Ajouter le domaine Cloudflare Pages en production
];

/**
 * Vérifie l'origin et retourne les headers CORS
 * @param {Request} request
 * @returns {Object} headers CORS
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || origin.includes('.pages.dev');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // Gestion preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Vérifier CORS
    if (!corsHeaders['Access-Control-Allow-Origin']) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      // POST /predict — Lance une prédiction, retourne prediction_id immédiatement
      if (url.pathname === '/predict' && request.method === 'POST') {
        return await handlePredict(request, env, corsHeaders);
      }

      // GET /status/:prediction_id — Retourne le statut actuel
      if (url.pathname.startsWith('/status/') && request.method === 'GET') {
        const predictionId = url.pathname.replace('/status/', '');
        return await handleStatus(predictionId, env, corsHeaders);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Lance une prédiction Replicate et retourne immédiatement le prediction_id
 * @param {Request} request — body: { model, input }
 * @param {Object} env — variables d'environnement (REPLICATE_API_TOKEN)
 * @param {Object} corsHeaders
 */
async function handlePredict(request, env, corsHeaders) {
  const { model, input } = await request.json();

  // Résoudre le nom du modèle
  const modelVersion = MODELS[model];
  if (!modelVersion) {
    return new Response(JSON.stringify({ error: `Modèle inconnu : ${model}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Appeler l'API Replicate pour créer la prédiction
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'respond-async',
    },
    body: JSON.stringify({
      model: modelVersion,
      input: input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: `Replicate API : ${response.status} — ${errorText}` }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const prediction = await response.json();

  // Retourner immédiatement le prediction_id — PAS de polling ici
  return new Response(JSON.stringify({
    prediction_id: prediction.id,
    status: prediction.status,
  }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Vérifie le statut d'une prédiction existante
 * @param {string} predictionId
 * @param {Object} env
 * @param {Object} corsHeaders
 */
async function handleStatus(predictionId, env, corsHeaders) {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: {
      'Authorization': `Bearer ${env.REPLICATE_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Statut introuvable : ${response.status}` }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const prediction = await response.json();

  return new Response(JSON.stringify({
    status: prediction.status,
    output: prediction.output,
    error: prediction.error,
    logs: prediction.logs,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
