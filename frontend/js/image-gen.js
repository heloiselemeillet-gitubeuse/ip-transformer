// image-gen.js — Écran 7 : Banque d'images
// Génère 1 image par personnage + 2 par lieu dans le style choisi
// Les épisodes piochent ensuite dans cette banque

/** Banque d'images : { characters: [...], locations: [...] } */
let imageBank = { characters: [], locations: [] };

/**
 * Initialise l'écran 7 — charge la banque existante ou lance la génération
 */
function initScreen7() {
  // Restaurer depuis State
  if (State.imageBank) {
    imageBank = State.imageBank;
  }

  // Vérifier si de nouveaux personnages/lieux ont été ajoutés au ID IP
  syncBankWithIdIP();

  displayImageBank();
}

/**
 * Synchronise la banque avec le ID IP actuel
 * Ajoute les nouveaux personnages/lieux sans supprimer les images existantes
 */
function syncBankWithIdIP() {
  const canon = State.idIP || {};
  const characters = canon.characters || [];
  const locations = canon.locations || [];

  // Ajouter les personnages manquants
  characters.forEach((char, i) => {
    const exists = imageBank.characters.some(img => img.charIndex === i);
    if (!exists) {
      imageBank.characters.push({
        charIndex: i,
        name: char.name,
        url: null,
        status: 'empty',
        prompt: '',
      });
    }
  });

  // Ajouter les lieux manquants (5 variantes chacun)
  locations.forEach((loc, i) => {
    if (!loc.name && !loc.description) return;
    for (let variant = 0; variant < 3; variant++) {
      const exists = imageBank.locations.some(img => img.locIndex === i && img.variant === variant);
      if (!exists) {
        imageBank.locations.push({
          locIndex: i,
          variant,
          name: loc.name,
          url: null,
          status: 'empty',
          prompt: '',
        });
      }
    }
  });

  State.imageBank = imageBank;
  State.save();
}

/**
 * Recrée les slots de la banque depuis le ID IP (bouton "Actualiser")
 * Conserve les images déjà générées si le personnage/lieu existe encore
 */
function resetBankSlots() {
  const oldBank = { ...imageBank };
  prepareBankSlots();

  // Restaurer les images existantes qui matchent
  imageBank.characters.forEach((slot, i) => {
    const old = (oldBank.characters || []).find(o => o.charIndex === slot.charIndex && o.url);
    if (old) {
      imageBank.characters[i] = old;
    }
  });
  imageBank.locations.forEach((slot, i) => {
    const old = (oldBank.locations || []).find(o => o.locIndex === slot.locIndex && o.variant === slot.variant && o.url);
    if (old) {
      imageBank.locations[i] = old;
    }
  });

  State.imageBank = imageBank;
  State.save();
  displayImageBank();
}

/**
 * Prépare les slots vides de la banque (sans générer)
 */
function prepareBankSlots() {
  const canon = State.idIP || {};
  const characters = canon.characters || [];
  const locations = canon.locations || [];

  imageBank = { characters: [], locations: [] };

  // 1 slot par personnage
  characters.forEach((char, i) => {
    imageBank.characters.push({
      charIndex: i,
      name: char.name,
      url: null,
      status: 'empty',
      prompt: '',
    });
  });

  // 2 slots par lieu
  locations.forEach((loc, i) => {
    if (!loc.name && !loc.description) return;
    for (let variant = 0; variant < 3; variant++) {
      imageBank.locations.push({
        locIndex: i,
        variant,
        name: loc.name,
        url: null,
        status: 'empty',
        prompt: '',
      });
    }
  });

  State.imageBank = imageBank;
  State.save();
}

/**
 * Génère toute la banque d'images : personnages + lieux
 */
async function generateImageBank() {
  const resultEl = document.getElementById('screen-7-result');
  if (resultEl) resultEl.style.display = 'none';

  const canon = State.idIP || {};
  const characters = canon.characters || [];
  const locations = canon.locations || [];
  const ctx = getFullStyleContext();

  const totalImages = characters.length + (locations.length * 2);

  if (totalImages === 0) {
    hideLoading('screen-7-loading');
    if (resultEl) {
      resultEl.style.display = 'block';
      const charGrid = document.getElementById('bank-characters-grid');
      if (charGrid) charGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">
          Aucun personnage ou lieu défini. Retournez à l'étape ID IP.
        </div>
      `;
    }
    return;
  }

  showLoading('screen-7-loading', 'replicate', {
    message: 'Génération de la banque d\'images',
    total: totalImages,
    current: 1,
  });

  // Charger toutes les refs photos depuis IndexedDB
  const allRefs = await dbGetAll(STORES.CHARACTER_REFS);

  imageBank = { characters: [], locations: [] };
  let imageCount = 0;

  // === PERSONNAGES (1 image chacun) ===
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    imageCount++;

    // Délai anti rate-limit (sauf premier)
    if (imageCount > 1) {
      updateLoadingProgress('screen-7-loading', ((imageCount - 1) / totalImages) * 100, `Pause anti rate-limit…`);
      await new Promise(r => setTimeout(r, 12000));
    }

    updateLoadingCounter('screen-7-loading', imageCount, totalImages);
    updateLoadingProgress('screen-7-loading', ((imageCount - 1) / totalImages) * 100, `Personnage : ${char.name || 'Sans nom'}`);

    // Chercher la photo de ref pour ce personnage (slot 0 uniquement en batch)
    let imageRef = null;
    const charRefMulti = allRefs.find(r => r.charIndex === `${i}-0`);
    const charRefSimple = allRefs.find(r => r.charIndex === i);
    const charRef = charRefMulti || charRefSimple;
    if (charRef) {
      const blob = new Blob([charRef.data], { type: charRef.type });
      imageRef = await blobToBase64(blob);
    }

    // Construire le prompt
    const prompt = buildBankPrompt({
      style: ctx.stylePrompt,
      palette: ctx.palette,
      tone: ctx.tone,
      universe: ctx.universe,
      subject: `character portrait of ${char.name || 'a character'}`,
      description: char.description || char.visualPrompt || '',
      type: 'character',
    });

    try {
      const imageUrl = await replicateGenerateImage({ prompt, imageRef }, (progress) => {
        updateLoadingProgress('screen-7-loading', ((imageCount - 1) / totalImages) * 100, `${char.name} — ${progress.status}`);
      });

      imageBank.characters.push({
        charIndex: i,
        name: char.name,
        url: imageUrl,
        status: 'pending',
        prompt,
      });
    } catch (err) {
      imageBank.characters.push({
        charIndex: i,
        name: char.name,
        url: null,
        status: 'error',
        error: err.message,
        prompt,
      });
    }
  }

  // === LIEUX (2 images chacun) ===
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    if (!loc.name && !loc.description) continue; // Ignorer les lieux vides

    for (let variant = 0; variant < 3; variant++) {
      imageCount++;

      // Délai anti rate-limit
      updateLoadingProgress('screen-7-loading', ((imageCount - 1) / totalImages) * 100, `Pause anti rate-limit…`);
      await new Promise(r => setTimeout(r, 12000));

      const LOCATION_VARIATIONS = [
        'daytime, bright sunlight, wide panoramic view, bustling with activity',
        'golden hour sunset, warm light, street level perspective, atmospheric',
        'nighttime, dramatic lighting, moody atmosphere, cinematic',
      ];
      const angle = LOCATION_VARIATIONS[variant % LOCATION_VARIATIONS.length];
      updateLoadingCounter('screen-7-loading', imageCount, totalImages);
      updateLoadingProgress('screen-7-loading', ((imageCount - 1) / totalImages) * 100, `Lieu : ${loc.name || 'Sans nom'} (vue ${variant + 1})`);

      // Chercher la photo de ref — seulement pour variant 0 (inspiration)
      // Variants 1+ utilisent le texte seul pour plus de diversité
      let imageRef = null;
      if (variant === 0) {
        const locRefMulti = allRefs.find(r => r.charIndex === `loc-${i}-0`);
        const locRefSimple = allRefs.find(r => r.charIndex === `loc-${i}`);
        const locRef = locRefMulti || locRefSimple;
        if (locRef) {
          const blob = new Blob([locRef.data], { type: locRef.type });
          imageRef = await blobToBase64(blob);
        }
      } else {
        // Chercher une ref multi-photo spécifique à ce variant
        const locRefVariant = allRefs.find(r => r.charIndex === `loc-${i}-${variant}`);
        if (locRefVariant) {
          const blob = new Blob([locRefVariant.data], { type: locRefVariant.type });
          imageRef = await blobToBase64(blob);
        }
        // Sinon : pas de ref → flux-schnell text-only → plus de diversité
      }

      const prompt = buildBankPrompt({
        style: ctx.stylePrompt,
        palette: ctx.palette,
        tone: ctx.tone,
        universe: ctx.universe,
        subject: `${loc.name || 'a location'}, ${angle}`,
        description: loc.description || '',
        type: 'location',
      });

      try {
        const imageUrl = await replicateGenerateImage({ prompt, imageRef }, (progress) => {
          updateLoadingProgress('screen-7-loading', ((imageCount - 1) / totalImages) * 100, `${loc.name} — ${progress.status}`);
        });

        imageBank.locations.push({
          locIndex: i,
          variant,
          name: loc.name,
          url: imageUrl,
          status: 'pending',
          prompt,
        });
      } catch (err) {
        imageBank.locations.push({
          locIndex: i,
          variant,
          name: loc.name,
          url: null,
          status: 'error',
          error: err.message,
          prompt,
        });
      }
    }
  }

  // Sauvegarder
  State.imageBank = imageBank;
  State.save();

  hideLoading('screen-7-loading');
  displayImageBank();
}

/**
 * Récupère le prompt de style complet (style + palette + ton + univers)
 * Fallback si State.visualStyle est null
 */
function getFullStyleContext() {
  const vs = State.visualStyle || {};
  const canon = State.idIP || {};

  // Style visuel (le plus important)
  let stylePrompt = vs.stylePrompt || '';
  if (!stylePrompt && canon.visualStyle) {
    stylePrompt = canon.visualStyle;
  }

  // Palette
  const palette = (vs.temperature || vs.contrast)
    ? `${vs.temperature || 'neutral'} palette, ${vs.contrast || 'contrasted'} lighting`
    : '';

  // Ton narratif → ambiance visuelle
  const tone = canon.tone ? `mood: ${canon.tone}` : '';

  // Univers → contexte visuel
  const universe = canon.universe || '';

  return { stylePrompt, palette, tone, universe };
}

/**
 * Construit le prompt pour la banque d'images
 */
function buildBankPrompt({ style, palette, subject, description, type, tone, universe }) {
  // Le style est LE cadre dominant — il enveloppe tout le prompt
  const styleTag = style || 'illustration';

  // Détecter si le style est manga/anime pour renforcement spécial
  const isManga = /manga|anime|manhwa|webtoon/i.test(styleTag);

  // Extraire un mot-clé court du style pour le renforcement
  const styleKeyword = isManga ? 'manga anime' : styleTag.split(',')[0].trim();

  const parts = [];

  // DÉBUT : style dominant en premier (le plus important pour le modèle)
  if (isManga) {
    parts.push('manga art, anime illustration, Japanese manga style, bold ink outlines, cel-shaded');
  } else {
    parts.push(styleTag);
  }

  // Sujet
  parts.push(subject);

  // Description courte
  if (description) parts.push(description.substring(0, 200));

  // Palette
  if (palette) parts.push(palette);

  // MILIEU : rappel du style
  if (isManga) {
    parts.push('drawn in manga style, 2D illustration, flat colors, expressive anime eyes');
  } else {
    parts.push(`rendered in ${styleKeyword}`);
  }

  // Qualité adaptée au type
  if (type === 'character') {
    parts.push(`${styleKeyword} character design, high quality, detailed`);
  } else {
    parts.push(`${styleKeyword} environment, detailed background, high quality`);
  }

  // FIN : renforcement final + anti-photo
  if (isManga) {
    parts.push('consistent manga anime style, hand-drawn 2D look, NOT photorealistic, NOT 3D render, NOT photograph');
  } else {
    parts.push(`consistent ${styleKeyword}, NOT photorealistic, NOT photo`);
  }

  return parts.join(', ');
}

/**
 * Affiche la banque d'images
 */
function displayImageBank() {
  hideLoading('screen-7-loading');

  const resultEl = document.getElementById('screen-7-result');
  if (resultEl) resultEl.style.display = 'block';

  // Personnages
  const charGrid = document.getElementById('bank-characters-grid');
  if (charGrid) {
    if (imageBank.characters.length === 0) {
      charGrid.innerHTML = '<p style="color:#999; padding:20px;">Aucun personnage à afficher.</p>';
    } else {
      charGrid.innerHTML = imageBank.characters.map((img, i) => renderBankCard(img, 'char', i)).join('');
    }
  }

  // Lieux
  const locGrid = document.getElementById('bank-locations-grid');
  if (locGrid) {
    if (imageBank.locations.length === 0) {
      locGrid.innerHTML = '<p style="color:#999; padding:20px;">Aucun lieu à afficher.</p>';
    } else {
      locGrid.innerHTML = imageBank.locations.map((img, i) => renderBankCard(img, 'loc', i)).join('');
    }
  }

  checkBankReady();
}

/**
 * Rend une carte d'image de la banque
 */
function renderBankCard(img, type, index) {
  const label = type === 'char'
    ? img.name || `Personnage ${index + 1}`
    : `${img.name || 'Lieu'} — variante ${(img.variant || 0) + 1}`;

  const isEmpty = img.status === 'empty' || (!img.url && !img.error);
  const isError = img.status === 'error';
  const isGenerating = img.status === 'generating';
  const isApproved = img.status === 'approved' && img.url;
  const isPending = img.url && img.status !== 'approved' && img.status !== 'error';
  const hasImage = !!img.url;

  return `
    <div class="gen-image-card ${isApproved ? 'gen-image-card--approved' : ''} ${isError ? 'gen-image-card--error' : ''}">
      <div class="gen-image-card__header">
        <span class="gen-image-card__scene">${type === 'char' ? '👤' : '📍'}</span>
        <span class="gen-image-card__title">${label}</span>
        ${hasImage ? `<button class="btn--icon-delete" onclick="deleteBankImage('${type}', ${index})" title="Supprimer">✕</button>` : ''}
      </div>
      <div class="gen-image-card__preview">
        ${img.url
          ? `<img src="${img.url}" alt="${label}" class="gen-image-card__img">`
          : isGenerating
            ? `<div class="style-card__loading"><div class="loading__spinner"></div><span>Génération…</span></div>`
            : isError
              ? `<div class="gen-image-card__error">${img.error || 'Erreur'}</div>`
              : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#999;padding:20px;text-align:center;">
                   <span style="font-size:40px;margin-bottom:12px;">${type === 'char' ? '👤' : '📍'}</span>
                   <span>Pas encore généré</span>
                 </div>`
        }
      </div>
      <div class="gen-image-card__actions">
        ${isApproved
          ? `<span class="gen-image-card__badge gen-image-card__badge--approved">✓ Approuvée</span>
             <button class="btn btn--small btn--secondary" onclick="generateBankSingle('${type}', ${index})">Régénérer</button>`
          : isError
            ? `<button class="btn btn--small btn--primary" onclick="generateBankSingle('${type}', ${index})">Réessayer</button>`
          : isPending
            ? `<button class="btn btn--small btn--primary" onclick="approveBankImage('${type}', ${index})">Approuver</button>
               <button class="btn btn--small btn--secondary" onclick="generateBankSingle('${type}', ${index})">Régénérer</button>`
          : isEmpty
            ? `<button class="btn btn--small btn--primary" onclick="generateBankSingle('${type}', ${index})">Générer</button>`
            : ''
        }
      </div>
    </div>
  `;
}

/**
 * Supprime une image de la banque (remet le slot vide)
 */
function deleteBankImage(type, index) {
  const arr = type === 'char' ? imageBank.characters : imageBank.locations;
  if (arr[index]) {
    arr[index].url = null;
    arr[index].status = 'empty';
    arr[index].prompt = ''; // Forcer un nouveau prompt à la prochaine génération
    arr[index].error = '';
    State.imageBank = imageBank;
    State.save();
    displayImageBank();
  }
}

/**
 * Approuve une image de la banque
 */
function approveBankImage(type, index) {
  const arr = type === 'char' ? imageBank.characters : imageBank.locations;
  if (arr[index] && arr[index].url) {
    arr[index].status = 'approved';
    State.imageBank = imageBank;
    State.save();
    displayImageBank();
  }
}

/**
 * Génère (ou régénère) une seule image de la banque
 * Construit le prompt si nécessaire puis lance Replicate
 */
async function generateBankSingle(type, index) {
  const arr = type === 'char' ? imageBank.characters : imageBank.locations;
  const item = arr[index];
  if (!item) return;

  const canon = State.idIP || {};
  const ctx = getFullStyleContext();

  // TOUJOURS reconstruire le prompt avec variation aléatoire
  if (type === 'char') {
    const char = (canon.characters || [])[item.charIndex] || {};
    // Variations aléatoires pour les personnages
    const CHAR_ANGLES = ['portrait, face visible, looking at camera', 'three-quarter view, dynamic pose', 'full body standing pose', 'close-up face, intense expression', 'side profile, dramatic lighting', 'action pose, in motion'];
    const CHAR_MOODS = ['confident and determined', 'relaxed and casual', 'thoughtful and contemplative', 'energetic and passionate', 'mysterious and intriguing'];
    const charAngle = CHAR_ANGLES[Math.floor(Math.random() * CHAR_ANGLES.length)];
    const charMood = CHAR_MOODS[Math.floor(Math.random() * CHAR_MOODS.length)];
    item.prompt = buildBankPrompt({
      style: ctx.stylePrompt,
      palette: ctx.palette,
      tone: ctx.tone,
      universe: ctx.universe,
      subject: `${charAngle} of ${char.name || 'a character'}, ${charMood}`,
      description: char.description || char.visualPrompt || '',
      type: 'character',
    });
  } else {
    const loc = (canon.locations || [])[item.locIndex] || {};
    // Grande variété de variations pour les lieux
    const LOC_PERSPECTIVES = [
      'aerial helicopter view from above',
      'street level perspective, human point of view',
      'wide establishing shot, panoramic',
      'close-up architectural details, textures',
      'view from inside looking out through a window',
      'dramatic low angle looking up',
    ];
    const LOC_CONDITIONS = [
      'bright sunshine, clear sky',
      'overcast sky, soft diffused light',
      'golden hour, warm orange light, long shadows',
      'rainy weather, wet reflections, puddles',
      'misty morning, fog, mysterious',
      'nighttime, artificial lights, neon glow',
      'snowy, winter atmosphere',
      'crowded with people, busy',
      'empty and quiet, serene',
    ];
    const perspective = LOC_PERSPECTIVES[Math.floor(Math.random() * LOC_PERSPECTIVES.length)];
    const condition = LOC_CONDITIONS[Math.floor(Math.random() * LOC_CONDITIONS.length)];
    item.prompt = buildBankPrompt({
      style: ctx.stylePrompt,
      palette: ctx.palette,
      tone: ctx.tone,
      universe: ctx.universe,
      subject: `${loc.name || 'a location'}, ${perspective}, ${condition}`,
      description: loc.description || '',
      type: 'location',
    });
  }

  // Spinner
  arr[index] = { ...item, url: null, status: 'generating', error: '' };
  displayImageBank();

  // Récupérer la ref photo — SEULEMENT pour la variante 0 (inspiration)
  // Les autres variantes utilisent le texte seul pour plus de diversité
  let imageRef = null;
  const variant = item.variant || 0;
  const allRefs = await dbGetAll(STORES.CHARACTER_REFS);

  if (type === 'char') {
    // Chercher ref par sous-index (multi-photo) ou index simple (compat)
    const charRefMulti = allRefs.find(r => r.charIndex === `${item.charIndex}-${variant}`);
    const charRefSingle = allRefs.find(r => r.charIndex === item.charIndex);
    const charRef = charRefMulti || (variant === 0 ? charRefSingle : null);
    if (charRef) {
      const blob = new Blob([charRef.data], { type: charRef.type });
      imageRef = await blobToBase64(blob);
    }
  } else {
    // Chercher ref par sous-index (multi-photo) ou index simple (compat)
    const locRefMulti = allRefs.find(r => r.charIndex === `loc-${item.locIndex}-${variant}`);
    const locRefSingle = allRefs.find(r => r.charIndex === `loc-${item.locIndex}`);
    const locRef = locRefMulti || (variant === 0 ? locRefSingle : null);
    if (locRef) {
      const blob = new Blob([locRef.data], { type: locRef.type });
      imageRef = await blobToBase64(blob);
    }
  }

  try {
    const imageUrl = await replicateGenerateImage({ prompt: item.prompt, imageRef });
    arr[index] = { ...item, url: imageUrl, status: 'pending', error: '' };
  } catch (err) {
    arr[index] = { ...item, url: null, status: 'error', error: err.message };
  }

  State.imageBank = imageBank;
  State.save();
  displayImageBank();
}

/**
 * Approuve toutes les images de la banque
 */
function approveAllBank() {
  [...imageBank.characters, ...imageBank.locations].forEach(img => {
    if (img.url && img.status !== 'error') img.status = 'approved';
  });
  State.imageBank = imageBank;
  State.save();
  displayImageBank();
}

/**
 * Vérifie si la banque est prête (au moins 1 image approuvée)
 */
function checkBankReady() {
  const allImages = [...imageBank.characters, ...imageBank.locations];
  const hasApproved = allImages.some(img => img.status === 'approved' && img.url);
  const hasPending = allImages.some(img => img.url && img.status !== 'approved' && img.status !== 'error');

  const btn = document.getElementById('btn-next-screen7');
  if (btn) btn.disabled = !hasApproved;

  const approveBtn = document.getElementById('btn-approve-all-bank');
  if (approveBtn) approveBtn.style.display = hasPending ? 'inline-flex' : 'none';
}

/**
 * Retourne les images de la banque assignées aux scènes d'un épisode.
 * Logique : pour chaque scène, on cherche le personnage ou lieu le plus pertinent
 * dans la banque en matchant les noms mentionnés dans le dialogue/description.
 * Fallback : on distribue les images approuvées en round-robin.
 * @param {number} episodeNum
 * @returns {Array} — images au format [{ sceneIndex, url, status }]
 */
function getBankImagesForEpisode(episodeNum) {
  const bank = State.imageBank || { characters: [], locations: [] };

  // Séparer personnages et lieux avec images
  const charImages = bank.characters.filter(img => img.url && (img.status === 'approved' || img.status === 'pending'));
  const locImages = bank.locations.filter(img => img.url && (img.status === 'approved' || img.status === 'pending'));
  const allImages = [...charImages, ...locImages];

  if (allImages.length === 0) return [];

  const script = State.scripts && State.scripts[episodeNum];
  if (!script || !script.scenes) return [];

  return script.scenes.map((scene, i) => {
    const sceneText = `${scene.visualDescription || ''} ${scene.title || ''} ${(scene.dialogue || []).map(d => d.speaker).join(' ')}`.toLowerCase();

    // 1. Chercher un lieu mentionné dans la scène
    let matchedLoc = locImages.find(img =>
      img.name && sceneText.includes(img.name.toLowerCase())
    );

    // 2. Chercher un personnage mentionné
    let matchedChar = charImages.find(img =>
      img.name && sceneText.includes(img.name.toLowerCase())
    );

    // 3. Logique d'alternance : scènes paires → décor, impaires → personnage
    // Avec fallback sur ce qui est disponible
    let matched;
    if (i % 2 === 0 && locImages.length > 0) {
      // Scène paire → préférer un décor
      matched = matchedLoc || locImages[i % locImages.length];
    } else if (charImages.length > 0) {
      // Scène impaire → préférer un personnage
      matched = matchedChar || charImages[i % charImages.length];
    } else {
      // Fallback
      matched = matchedLoc || matchedChar || allImages[i % allImages.length];
    }

    return {
      sceneIndex: i,
      url: matched.url,
      status: matched.status,
    };
  });
}
