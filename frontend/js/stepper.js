// stepper.js — Composant stepper Neo Pop Tech Human
// Desktop : liste plate d'étapes numérotées avec connecteurs
// Mobile (<768px) : compact "Étape 3/13 — ID IP" + barre de progression

/** Référence vers les conteneurs du stepper */
let stepperContainer = null;
let stepperMobileContainer = null;

/** Références globales */
let stepperScreens = [];
let stepperAppState = null;

/** Index max atteint — permet la navigation libre vers toute étape déjà visitée */
let stepperMaxVisited = 0;

/* Phases supprimées — le stepper est une liste plate d'étapes */

/**
 * Initialise le stepper
 * @param {Array} screens — liste des écrans (SCREENS dans app.js)
 * @param {Object} appState — état global de l'app
 */
function initStepper(screens, appState) {
  stepperScreens = screens;
  stepperAppState = appState;
  stepperContainer = document.getElementById('stepper');
  stepperMobileContainer = document.getElementById('stepper-mobile');

  if (!stepperContainer) return;

  renderStepper();
}

/**
 * Génère le stepper desktop — liste plate d'étapes sans labels de phase
 */
function renderStepper() {
  if (!stepperContainer) return;

  const visible = getVisibleScreens();
  stepperContainer.innerHTML = '';

  visible.forEach((screen, i) => {
    const step = document.createElement('div');
    step.className = 'stepper__step';
    step.dataset.screenId = screen.id;

    const number = document.createElement('span');
    number.className = 'stepper__number';
    number.textContent = i + 1;
    step.appendChild(number);

    const label = document.createElement('span');
    label.className = 'stepper__label';
    label.textContent = screen.label;
    step.appendChild(label);

    // Clic pour naviguer vers toute étape déjà visitée
    step.addEventListener('click', () => {
      if (i <= stepperMaxVisited) {
        navigateTo(screen.id);
      }
    });

    stepperContainer.appendChild(step);

    // Connecteur entre étapes (sauf la dernière)
    if (i < visible.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'stepper__connector';
      stepperContainer.appendChild(connector);
    }
  });

  updateStepper(stepperAppState.currentScreen);
}

/**
 * Met à jour l'état visuel du stepper desktop + mobile
 * @param {string} currentScreenId — id de l'écran courant
 */
function updateStepper(currentScreenId) {
  const visible = getVisibleScreens();
  const currentIndex = visible.findIndex(s => s.id === currentScreenId);

  // Mettre à jour le max visité
  if (currentIndex > stepperMaxVisited) {
    stepperMaxVisited = currentIndex;
  }

  // --- Desktop ---
  if (stepperContainer) {
    const steps = stepperContainer.querySelectorAll('.stepper__step');
    const connectors = stepperContainer.querySelectorAll('.stepper__connector');

    steps.forEach((step) => {
      const screenId = step.dataset.screenId;
      const idx = visible.findIndex(s => s.id === screenId);

      step.classList.remove('stepper__step--active', 'stepper__step--completed', 'stepper__step--upcoming');

      if (idx === currentIndex) {
        step.classList.add('stepper__step--active');
      } else if (idx <= stepperMaxVisited) {
        step.classList.add('stepper__step--completed');
      } else {
        step.classList.add('stepper__step--upcoming');
      }

      // Cursor cliquable pour les étapes visitées
      step.style.cursor = idx <= stepperMaxVisited ? 'pointer' : 'default';
    });

    // Connecteurs : on les indexe globalement
    let connectorGlobalIndex = 0;
    connectors.forEach((connector) => {
      connector.classList.remove('stepper__connector--completed');
      // Trouver les steps avant et après ce connecteur
      const prevStep = connector.previousElementSibling;
      if (prevStep && prevStep.dataset.screenId) {
        const prevIdx = visible.findIndex(s => s.id === prevStep.dataset.screenId);
        if (prevIdx < currentIndex) {
          connector.classList.add('stepper__connector--completed');
        }
      }
    });

    // Scroll l'étape active en vue
    const activeStep = stepperContainer.querySelector('.stepper__step--active');
    if (activeStep) {
      activeStep.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // --- Mobile ---
  if (stepperMobileContainer) {
    const currentScreen = visible[currentIndex];
    const totalSteps = visible.length;
    const stepNum = currentIndex + 1;

    stepperMobileContainer.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <span class="stepper-mobile__step">Étape ${stepNum}/${totalSteps}</span>
        <span class="stepper-mobile__label">— ${currentScreen ? currentScreen.label : ''}</span>
      </div>
      <div class="stepper-mobile__progress">
        <div class="stepper-mobile__progress-fill" style="width: ${(stepNum / totalSteps) * 100}%"></div>
      </div>
    `;
  }
}
