// webtoon-export.js — Export webtoon vers JPEG long via <canvas>
// Dessine les 3 panneaux + gouttières + bulles sur un canvas, exporte en JPEG

/**
 * Exporte un épisode webtoon en JPEG long
 * @param {number} episodeNum — numéro de l'épisode
 */
async function exportWebtoonJPEG(episodeNum) {
  const data = State.webtoonData && State.webtoonData[episodeNum];
  if (!data || !data.panels) {
    alert('Aucune donnée webtoon pour cet épisode.');
    return;
  }

  showLoading('screen-13-loading', 'claude', {
    message: 'Génération du JPEG…',
  });

  try {
    const blob = await renderWebtoonToCanvas(data, episodeNum);

    // Télécharger
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const episode = getEpisodeData(episodeNum);
    const title = episode ? episode.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, '').replace(/\s+/g, '-') : '';
    a.download = `webtoon-ep${episodeNum}${title ? '-' + title : ''}.jpg`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideLoading('screen-13-loading');
  } catch (err) {
    hideLoading('screen-13-loading');
    alert(`Erreur d'export : ${err.message}`);
    console.error('Erreur export webtoon :', err);
  }
}

/**
 * Dessine le webtoon complet sur un canvas et retourne un Blob JPEG
 * @param {Object} data — données webtoon de l'épisode
 * @param {number} episodeNum — numéro de l'épisode
 * @returns {Promise<Blob>} — blob JPEG
 */
async function renderWebtoonToCanvas(data, episodeNum) {
  const WIDTH = 720;
  const panelHeight = 960; // ratio ~3:4 par panneau

  // Calculer la hauteur totale
  let totalHeight = 0;
  for (let i = 0; i < data.panels.length; i++) {
    totalHeight += panelHeight;
    if (i < data.panels.length - 1) {
      totalHeight += data.panels[i].gutterAfter || data.gutterSize || 30;
    }
  }

  // Créer le canvas
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  // Fond noir
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, WIDTH, totalHeight);

  // Dessiner chaque panneau
  let yOffset = 0;

  for (let i = 0; i < data.panels.length; i++) {
    const panel = data.panels[i];

    // Dessiner l'image du panneau
    if (panel.imageUrl) {
      try {
        const img = await loadImage(panel.imageUrl);
        // Couvrir le panneau en gardant le ratio
        const imgRatio = img.width / img.height;
        const panelRatio = WIDTH / panelHeight;

        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > panelRatio) {
          // Image plus large : crop horizontal
          sw = img.height * panelRatio;
          sx = (img.width - sw) / 2;
        } else {
          // Image plus haute : crop vertical
          sh = img.width / panelRatio;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, yOffset, WIDTH, panelHeight);
      } catch (e) {
        // Image non chargeable : fond gris
        ctx.fillStyle = '#222';
        ctx.fillRect(0, yOffset, WIDTH, panelHeight);
        console.warn(`Image panneau ${i} non chargeable`, e);
      }
    }

    // Dessiner les bulles — triées par position Y (haut → bas) pour suivre l'histoire
    const sortedBubbles = [...panel.bubbles].sort((a, b) => a.y - b.y);
    for (const bubble of sortedBubbles) {
      drawBubble(ctx, bubble, yOffset, WIDTH, panelHeight);
    }

    yOffset += panelHeight;

    // Gouttière
    if (i < data.panels.length - 1) {
      const gutterH = panel.gutterAfter || data.gutterSize || 30;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, yOffset, WIDTH, gutterH);
      yOffset += gutterH;
    }
  }

  // Convertir en JPEG
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Échec de conversion canvas en JPEG'));
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Dessine une bulle de dialogue sur le canvas
 * @param {CanvasRenderingContext2D} ctx — contexte canvas
 * @param {Object} bubble — données de la bulle
 * @param {number} panelY — offset Y du panneau
 * @param {number} panelW — largeur du panneau
 * @param {number} panelH — hauteur du panneau
 */
function drawBubble(ctx, bubble, panelY, panelW, panelH) {
  const x = (bubble.x / 100) * panelW;
  const y = panelY + (bubble.y / 100) * panelH;
  const fontSize = bubble.fontSize || 24;
  const padding = 12;
  const maxWidth = 260;

  // Mesurer le texte
  ctx.font = `${fontSize}px Inter, sans-serif`;
  const lines = wrapText(ctx, bubble.text, maxWidth - padding * 2);
  const speakerLine = bubble.speaker ? bubble.speaker : null;

  const lineHeight = fontSize * 1.3;
  const textHeight = lines.length * lineHeight + (speakerLine ? lineHeight : 0);
  const bubbleW = Math.min(maxWidth, Math.max(120, ...lines.map(l => ctx.measureText(l).width)) + padding * 2);
  const bubbleH = textHeight + padding * 2;

  ctx.save();

  // Forme de la bulle selon le style
  if (bubble.style === 'cloud') {
    drawCloudShape(ctx, x, y, bubbleW, bubbleH);
  } else if (bubble.style === 'jagged') {
    drawJaggedShape(ctx, x, y, bubbleW, bubbleH);
  } else if (bubble.style === 'rect') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, bubbleW, bubbleH);
    ctx.strokeStyle = bubble.color || '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bubbleW, bubbleH);
  } else {
    // Rond (dialogue) — défaut
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    roundRect(ctx, x, y, bubbleW, bubbleH, 16);
    ctx.fill();
    ctx.strokeStyle = bubble.color || '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Queue de bulle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + bubbleH);
    ctx.lineTo(x + 10, y + bubbleH + 15);
    ctx.lineTo(x + 35, y + bubbleH);
    ctx.fill();
  }

  // Texte du speaker
  let textY = y + padding + fontSize;
  if (speakerLine) {
    ctx.fillStyle = bubble.color || '#7c3aed';
    ctx.font = `bold ${fontSize * 0.75}px Inter, sans-serif`;
    ctx.fillText(speakerLine, x + padding, textY - fontSize * 0.3);
    textY += lineHeight * 0.6;
  }

  // Texte principal
  ctx.fillStyle = bubble.style === 'rect' ? '#fff' : '#111';
  ctx.font = `${fontSize}px Inter, sans-serif`;
  for (const line of lines) {
    ctx.fillText(line, x + padding, textY);
    textY += lineHeight;
  }

  ctx.restore();
}

/**
 * Dessine un tracé arrondi (polyfill roundRect)
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

/**
 * Dessine une forme nuage (bulle pensée)
 */
function drawCloudShape(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();

  // Nuage avec des arcs
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Petits cercles de pensée
  ctx.beginPath();
  ctx.arc(x + 15, y + h + 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 5, y + h + 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Dessine une forme dentelée (bulle cri)
 */
function drawJaggedShape(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(255, 255, 100, 0.95)';
  ctx.beginPath();

  const cx = x + w / 2;
  const cy = y + h / 2;
  const spikes = 12;

  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0
      ? Math.max(w, h) * 0.55
      : Math.max(w, h) * 0.4;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius * (h / w);

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Découpe un texte en lignes selon une largeur max
 * @param {CanvasRenderingContext2D} ctx — contexte canvas
 * @param {string} text — texte à découper
 * @param {number} maxWidth — largeur max en pixels
 * @returns {Array<string>} — lignes
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [''];
}

/**
 * Charge une image depuis une URL et retourne un HTMLImageElement
 * @param {string} url — URL de l'image
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger l'image : ${url}`));
    img.src = url;
  });
}

/**
 * Exporte tous les épisodes webtoon en JPEG
 */
async function exportAllWebtoons() {
  for (let ep = 1; ep <= 5; ep++) {
    if (State.webtoonData && State.webtoonData[ep]) {
      await exportWebtoonJPEG(ep);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
