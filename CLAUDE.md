# CLAUDE.md — IP Transformer

## RÈGLES DE TRAVAIL (TOUJOURS RESPECTER)

1. Génère UNIQUEMENT ce que je te demande à chaque étape.
2. Ne génère JAMAIS l'étape suivante sans ma validation explicite.
3. Quand tu commences une phase, commence UNIQUEMENT par la structure de fichiers.
4. Après chaque écran, montre-moi le résultat et attends mon OK.
5. Si tu as un doute technique, demande-moi plutôt que d'inventer une solution.
6. Commente le code en français.

## PROJET

IP Transformer — Moteur de ré-exploitation d'IP existante en contenus narratifs sérialisés.
L'IA ne génère pas ex nihilo : elle EXTRAIT, STRUCTURE et ADAPTE une IP source.

Deux démos POC :
- DÉMO A : Podcast (via YouTube) → Webtoon
- DÉMO B : Peintures (upload œuvres) → Micro-drama vidéo (+ son optionnel)

Promesse : "Réexploitez une IP existante en plusieurs formats sans repartir de zéro."

## STACK TECHNIQUE

- Frontend : HTML/CSS/JavaScript (single page app)
- Backend : Cloudflare Workers (proxy sécurisé)
- IA narrative + vision : Claude API (Anthropic)
- IA transcription : Whisper via Replicate (fallback si pas de sous-titres YouTube)
- IA images : Flux Redux via Replicate (accepte image input — PAS Flux standard)
- IA vidéo : Wan 2.1 via Replicate — clips de 5-15s
- Musique : bibliothèque de tracks libres de droits intégrée (frontend/assets/music/)
- (Roadmap V2) IA son : TTS via Replicate + MusicGen pour musique sur mesure
- Assemblage vidéo : ffmpeg.wasm v0.12.x (DESKTOP UNIQUEMENT)
- Déploiement : Cloudflare Pages + Workers
- Repo : GitHub

## MODES D'INPUT

MODE PODCAST :
- Input : lien YouTube ou fichier transcript (.txt/.srt/.vtt)
- Extraction transcript : sous-titres YouTube (prioritaire) ou Whisper (fallback)
- L'IA extrait les faits, citations, intervenants du podcast réel
- NE PAS inventer de faits. Adapter la forme, pas le fond.

MODE PEINTURE :
- Input : 3 à 10 images d'œuvres (JPG/PNG/WebP, max 5 Mo chacune)
- L'IA analyse l'univers visuel et crée une histoire fidèle au style de l'artiste
- Respecter la palette, l'ambiance, les personnages des tableaux

## CANON IP (concept central)

Objet structuré généré à l'écran 3b, envoyé dans CHAQUE prompt IA suivant.
Contient : personnages, univers, ton, contraintes, références visuelles.
C'est le verrou de fidélité — l'IA doit le respecter à chaque étape.

## ARCHITECTURE VIDÉO (micro-drama)

Pour un épisode de ~45 secondes (POC) :
- 3 SOUS-SCÈNES de ~15 secondes chacune
- 1 clip vidéo par sous-scène (Wan ou Ken Burns)
- Assemblage des 3 clips via ffmpeg.wasm (transitions)
- Musique d'ambiance : track libre de droits choisie par l'utilisateur, mixée à l'assemblage
  → 10-15 tracks embarquées dans frontend/assets/music/ (MP3, ~1-2 Mo chacune)
  → ffmpeg.wasm mixe la musique avec la vidéo (trim à la durée + fade out final)
- Format de sortie : 9:16 (vertical) par défaut

## ARCHITECTURE WEBTOON

Pour un épisode webtoon :
- 3 images empilées verticalement, 720px de large
- Gouttières 20-60px (rythme de lecture)
- Bulles de dialogue (placement auto, ajustable)
- Mode podcast : vraies citations + couleur par intervenant
- Export : JPEG long via <canvas>

## PARCOURS UTILISATEUR

Écran 0 : Accueil — choix du mode (podcast ou peinture)
Écran 1 : Asset Loader — lien YouTube OU upload œuvres
Écran 2 : Analyse IA de l'asset source
Écran 3 : Histoire structurée (fidèle à l'IP)
Écran 3b : Canon IP / Bible de marque (verrou de fidélité)
Écran 4 : Découpage en 5 épisodes
Écran 5 : Scripts détaillés (3 sous-scènes par épisode)
Écran 5b : Choix du format de sortie (webtoon / micro-drama / les deux)
  ↓ Puis :
  WEBTOON : Écrans 6 → 7 → 8 → 13
  MICRO-DRAMA : Écrans 6 → 7 → 8 → 9 → 10 → 11 → 12

Stepper de navigation permanent en haut de chaque écran.

## CONTRAINTE CRITIQUE : POLLING REPLICATE

Worker ne doit JAMAIS poll Replicate (timeout 30s).
1. Frontend → Worker : lance prédiction
2. Worker → Replicate : reçoit prediction_id, retourne immédiatement
3. Frontend poll GET /status/:id toutes les 5s via Worker
4. Quand "succeeded" → frontend récupère le résultat

## STOCKAGE

- localStorage : state léger uniquement (navigation, choix, textes, canon IP)
- IndexedDB : tous les assets lourds (images, vidéos, audio, character refs)
  → Lib `idb` pour simplifier

## SCOPE POC

- 2 démos : podcast→webtoon ET peinture→micro-drama
- 5 épisodes par projet, 3 sous-scènes de 15s (= ~45s/épisode)
- Son (TTS) : optionnel
- Assemblage vidéo : DESKTOP UNIQUEMENT
- Auto-batch : production semi-auto des épisodes 2-5 après validation épisode 1

## COHÉRENCE DES PERSONNAGES

Double approche Redux + description textuelle :
1. Photos de référence uploadées à l'écran 3b (canon IP)
2. Claude Vision génère descriptions textuelles détaillées
3. Flux Redux (flux-redux-dev) reçoit image de référence en input
4. Prompt combine : texte + image via Redux
5. Panneau latéral permanent pour comparaison

IMPORTANT : Flux Redux, PAS Flux standard (text-only).

## CLÉS API & SÉCURITÉ

Jamais de clé API dans le frontend. Tout dans wrangler secret.

CORS obligatoire sur TOUS les Workers :
- Vérifier Origin (domaine Pages + localhost)
- 403 si non autorisé
- Headers CORS standards
- Gérer OPTIONS preflight

## UX — FEEDBACK D'ATTENTE OBLIGATOIRE

- Claude API (< 30s) : spinner + message contextuel + estimation + skeleton
- Replicate (30s-5min) : progress bar + statut + compteur + numéro élément
- YouTube transcript (10-30s) : spinner + message
- ffmpeg.wasm (30s-2min) : progress bar % réel
Ne JAMAIS laisser l'écran figé.

## DESIGN UI

- Fond principal : #0a0a0a / Fond cartes : #1a1a2e (glassmorphism 0.8)
- Accent primaire : #7c3aed (violet) / Accent secondaire : #06b6d4 (cyan)
- Texte principal : #f1f5f9 / Texte secondaire : #94a3b8
- Bordures : #334155 / Succès : #10b981 / Erreur : #ef4444
- Typo : Inter (Google Fonts) — body 16px, headings bold
- Border-radius : 12px cartes, 8px boutons
- Glassmorphism : backdrop-filter: blur(10px)
- Transitions : 200ms ease hover, 300ms changements d'écran
