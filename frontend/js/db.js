// db.js — IndexedDB pour les assets lourds
// Images, vidéos, audio, character refs
// Utilise l'API IndexedDB native (pas de dépendance externe pour le POC)

const DB_NAME = 'ip-transformer-db';
const DB_VERSION = 1;

// Noms des object stores
const STORES = {
  PAINTINGS: 'paintings',       // Œuvres uploadées (mode peinture)
  IMAGES: 'images',             // Images générées (webtoon, références)
  VIDEOS: 'videos',             // Clips vidéo générés
  AUDIO: 'audio',               // Fichiers audio (TTS, musique)
  CHARACTER_REFS: 'characterRefs', // Photos de référence personnages
};

/**
 * Ouvre la base de données IndexedDB
 * Crée les object stores si nécessaire
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Création / mise à jour de la structure
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Créer chaque store s'il n'existe pas
      for (const storeName of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sauvegarde un asset dans IndexedDB
 * @param {string} storeName — nom du store (utiliser STORES.xxx)
 * @param {Object} data — objet à sauvegarder (doit contenir les données binaires)
 * @returns {Promise<number>} — id de l'élément créé
 */
async function dbSave(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Récupère un asset par son id
 * @param {string} storeName — nom du store
 * @param {number} id — id de l'élément
 * @returns {Promise<Object|undefined>}
 */
async function dbGet(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Récupère tous les assets d'un store
 * @param {string} storeName — nom du store
 * @returns {Promise<Array>}
 */
async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Supprime un asset par son id
 * @param {string} storeName — nom du store
 * @param {number} id — id de l'élément
 * @returns {Promise<void>}
 */
async function dbDelete(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Vide complètement un store
 * @param {string} storeName — nom du store
 * @returns {Promise<void>}
 */
async function dbClear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
