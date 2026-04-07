// Worker API Proxy — Claude API (Anthropic)
// Proxy sécurisé : la clé API reste côté serveur, jamais dans le frontend

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

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

    // Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Vérifier CORS
    if (!corsHeaders['Access-Control-Allow-Origin']) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      // POST /chat — Appel à Claude API
      if (url.pathname === '/chat' && request.method === 'POST') {
        return await handleChat(request, env, corsHeaders);
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
 * Gère l'appel à Claude API
 * Body attendu : { prompt: string, images?: Array<{ base64: string, mediaType: string }> }
 * Retourne la réponse JSON de Claude
 */
async function handleChat(request, env, corsHeaders) {
  const { prompt, images } = await request.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Le prompt est requis' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Construire le message content
  const content = [];

  // Ajouter les images (Claude Vision)
  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType || 'image/jpeg',
          data: img.base64,
        },
      });
    }
  }

  // Ajouter le texte
  content.push({ type: 'text', text: prompt });

  // Appel à l'API Anthropic
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: `Claude API : ${response.status} — ${errorText}` }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await response.json();

  // Extraire le texte de la réponse Claude
  const textContent = result.content.find(c => c.type === 'text');
  const responseText = textContent ? textContent.text : '';

  // Tenter de parser en JSON, sinon retourner le texte brut
  try {
    const parsed = JSON.parse(responseText);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    // Pas du JSON — retourner le texte dans un objet
    return new Response(JSON.stringify({ text: responseText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
