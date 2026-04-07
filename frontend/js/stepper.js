// stepper.js — Composant stepper Neo Pop Tech Human
// Desktop : phases (Extraction | Visuels | Production) avec étapes groupées
// Mobile (<768px) : compact "Étape 3/13 — ID IP" + barre de progression

/** Référence vers les conteneurs du stepper */
let stepperContainer = null;
let stepperMobileContainer = null;

/** Références globales */
let stepperScreens = [];
let stepperAppState = null;

/**
 * Définition des 3 phases visuelles
 * Chaque phase regroupe des écrans par leur id
 */
const STEPPER_PHASES = [
  {
    key: 'extraction',
    label: 'Extraction',
    cssClass: 'stepper__phase--extraction',
    screenIds: ['screen-0', 'screen-1', 'screen-2', 'screen-3', 'screen-3b', 'screen-4', 'screen-5', 'screen-5b'],
  },
  {
    key: 'visuels',
    label: 'Visuels',
    cssClass: 'stepper__phase--visuels',
    screenIds: ['screen-6', 'screen-7', 'screen-8'],
  },
  {
    key: 'production',
    label: 'Production',
    cssClass: 'stepper__phase--production',
    screenIds: ['screen-9', 'screen-10', 'screen-11', 'screen-12', 'screen-13'],
  },
];

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
 * Génère le stepper desktop avec phases groupées
 */
function renderStepper() {
  if (!stepperContainer) return;

  const visible = getVisibleScreens();
  stepperContainer.innerHTML = '';

  STEPPER_PHASES.forEach((phase, phaseIndex) => {
    // Filtrer les écrans de cette phase qui sont visibles
    const phaseScreens = visible.filter(s => phase.screenIds.includes(s.id));
    if (phaseScreens.length === 0) return;

    // Séparateur entre phases (sauf la première)
    if (phaseIndex > 0) {
      const divider = document.createElement('div');
      divider.className = 'stepper__phase-divider';
      stepperContainer.appendChild(divider);
    }

    // Conteneur de phase
    const phaseEl = document.createElement('div');
    phaseEl.className = `stepper__phase ${phase.cssClass}`;

    // Label de phase
    const phaseLabel = document.createElement('span');
    phaseLabel.className = 'stepper__phase-label';
    phaseLabel.textContent = phase.label;
    phaseEl.appendChild(phaseLabel);

    // Étapes dans cette phase
    phaseScreens.forEach((screen, i) => {
      const globalIndex = visible.indexOf(screen);

      const step = document.createElement('div');
      step.className = 'stepper__step';
      step.dataset.screenId = screen.id;

      const number = document.createElement('span');
      number.className = 'stepper__number';
      number.textContent = globalIndex + 1;
      step.appendChild(number);

      const label = document.createElement('span');
      label.className = 'stepper__label';
      label.textContent = screen.label;
      step.appendChild(label);

      // Clic pour naviguer vers étapes précédentes
      step.addEventListener('click', () => {
        const currentIndex = visible.findIndex(s => s.id === stepperAppState.currentScreen);
        if (globalIndex <= currentIndex) {
          navigateTo(screen.id);
        }
      });

      phaseEl.appendChild(step);

      // Connecteur entre étapes (sauf la dernière de la phase)
      if (i < phaseScreens.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'stepper__connector';
        phaseEl.appendChild(connector);
      }
    });

    stepperContainer.appendChild(phaseEl);
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

  // --- Desktop ---
  if (stepperContainer) {
    const steps = stepperContainer.querySelectorAll('.stepper__step');
    const connectors = stepperContainer.querySelectorAll('.stepper__connector');

    let stepIndex = 0;
    steps.forEach((step) => {
      const screenId = step.dataset.screenId;
      const idx = visible.findIndex(s => s.id === screenId);

      step.classList.remove('stepper__step--active', 'stepper__step--completed', 'stepper__step--upcoming');

      if (idx === currentIndex) {
        step.classList.add('stepper__step--active');
      } else if (idx < currentIndex) {
        step.classList.add('stepper__step--completed');
      } else {
        step.classList.add('stepper__step--upcoming');
      }
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
