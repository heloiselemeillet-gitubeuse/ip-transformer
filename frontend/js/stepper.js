// stepper.js — Composant stepper de navigation
// Barre de progression permanente en haut de chaque écran

/** Référence vers le conteneur du stepper dans le DOM */
let stepperContainer = null;

/** Références globales pour accès depuis les autres modules */
let stepperScreens = [];
let stepperAppState = null;

/**
 * Initialise le stepper avec la liste des écrans et l'état de l'app
 * @param {Array} screens — liste des écrans (depuis SCREENS dans app.js)
 * @param {Object} appState — état global de l'app
 */
function initStepper(screens, appState) {
  stepperScreens = screens;
  stepperAppState = appState;
  stepperContainer = document.getElementById('stepper');

  if (!stepperContainer) return;

  renderStepper();
}

/**
 * Génère le HTML du stepper
 * Affiche uniquement les écrans visibles selon le format choisi
 */
function renderStepper() {
  if (!stepperContainer) return;

  const visible = getVisibleScreens();
  stepperContainer.innerHTML = '';

  visible.forEach((screen, index) => {
    // Élément d'étape
    const step = document.createElement('div');
    step.className = 'stepper__step';
    step.dataset.screenId = screen.id;

    // Numéro de l'étape
    const number = document.createElement('span');
    number.className = 'stepper__number';
    number.textContent = index + 1;
    step.appendChild(number);

    // Label de l'étape
    const label = document.createElement('span');
    label.className = 'stepper__label';
    label.textContent = screen.label;
    step.appendChild(label);

    // Clic pour naviguer (uniquement vers les étapes déjà visitées)
    step.addEventListener('click', () => {
      const currentIndex = visible.findIndex(s => s.id === stepperAppState.currentScreen);
      const targetIndex = index;
      // On ne peut naviguer que vers les étapes précédentes ou l'étape courante
      if (targetIndex <= currentIndex) {
        navigateTo(screen.id);
      }
    });

    stepperContainer.appendChild(step);

    // Connecteur entre les étapes (sauf la dernière)
    if (index < visible.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'stepper__connector';
      stepperContainer.appendChild(connector);
    }
  });

  // Appliquer l'état actif
  updateStepper(stepperAppState.currentScreen);
}

/**
 * Met à jour l'état visuel du stepper (étape active, complétées, futures)
 * @param {string} currentScreenId — id de l'écran courant
 */
function updateStepper(currentScreenId) {
  if (!stepperContainer) return;

  const visible = getVisibleScreens();
  const currentIndex = visible.findIndex(s => s.id === currentScreenId);
  const steps = stepperContainer.querySelectorAll('.stepper__step');
  const connectors = stepperContainer.querySelectorAll('.stepper__connector');

  steps.forEach((step, index) => {
    step.classList.remove('stepper__step--active', 'stepper__step--completed', 'stepper__step--upcoming');

    if (index === currentIndex) {
      step.classList.add('stepper__step--active');
    } else if (index < currentIndex) {
      step.classList.add('stepper__step--completed');
    } else {
      step.classList.add('stepper__step--upcoming');
    }
  });

  // Mettre à jour les connecteurs
  connectors.forEach((connector, index) => {
    connector.classList.remove('stepper__connector--completed');
    if (index < currentIndex) {
      connector.classList.add('stepper__connector--completed');
    }
  });
}
