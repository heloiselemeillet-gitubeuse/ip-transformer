// Worker YouTube Proxy — Extraction de transcripts YouTube
// Extrait les sous-titres auto/manuels depuis l'API interne YouTube
// Pas de clé API nécessaire

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

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!corsHeaders['Access-Control-Allow-Origin']) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      if (url.pathname === '/transcript' && request.method === 'POST') {
        return await handleTranscript(request, env, corsHeaders);
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
 * Extrait le videoId depuis une URL YouTube
 */
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Récupère la page YouTube et extrait les données de caption
 */
async function handleTranscript(request, env, corsHeaders) {
  const { url } = await request.json();

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL YouTube requise' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return new Response(JSON.stringify({ error: 'URL YouTube invalide' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Récupérer la page YouTube pour extraire les caption tracks
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
  });

  if (!pageResponse.ok) {
    return new Response(JSON.stringify({ error: `YouTube non accessible : ${pageResponse.status}` }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const html = await pageResponse.text();

  // Extraire le titre
  const titleMatch = html.match(/"title":"(.*?)"/);
  const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"') : '';

  // Extraire les caption tracks depuis le JSON embarqué
  const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionMatch) {
    return new Response(JSON.stringify({
      error: 'Aucun sous-titre disponible pour cette vidéo',
      videoId,
      title,
      source: 'none',
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let captionTracks;
  try {
    captionTracks = JSON.parse(captionMatch[1]);
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur de parsing des sous-titres' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Prioriser : français manuel > français auto > anglais > premier disponible
  const track = pickBestTrack(captionTracks);
  if (!track) {
    return new Response(JSON.stringify({ error: 'Aucune piste de sous-titres exploitable' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Télécharger le XML des sous-titres
  const captionUrl = track.baseUrl.replace(/\\u0026/g, '&');
  const captionResponse = await fetch(captionUrl);

  if (!captionResponse.ok) {
    return new Response(JSON.stringify({ error: 'Échec du téléchargement des sous-titres' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const xml = await captionResponse.text();

  // Parser le XML des sous-titres
  const transcript = parseTranscriptXML(xml);

  const isAuto = track.kind === 'asr';
  const source = isAuto ? 'youtube-auto' : 'youtube-subs';

  return new Response(JSON.stringify({
    transcript,
    source,
    title,
    videoId,
    language: track.languageCode,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Choisit la meilleure piste de sous-titres
 * Priorité : fr manuel > fr auto > en manuel > en auto > premier disponible
 */
function pickBestTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;

  // Chercher français manuel
  const frManual = tracks.find(t => t.languageCode === 'fr' && t.kind !== 'asr');
  if (frManual) return frManual;

  // Français auto
  const frAuto = tracks.find(t => t.languageCode === 'fr');
  if (frAuto) return frAuto;

  // Anglais manuel
  const enManual = tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr');
  if (enManual) return enManual;

  // Anglais auto
  const enAuto = tracks.find(t => t.languageCode === 'en');
  if (enAuto) return enAuto;

  // Premier disponible
  return tracks[0];
}

/**
 * Parse le XML des sous-titres YouTube en texte brut
 * Format XML : <transcript><text start="0" dur="5.2">texte</text>...</transcript>
 */
function parseTranscriptXML(xml) {
  const segments = [];
  const regex = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g;

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, '') // Supprimer les balises HTML internes
      .trim();

    if (text) {
      segments.push(text);
    }
  }

  return segments.join(' ');
}
