/**
 * IndexedDB-based save system.
 * Stores complete game state snapshots in named save slots.
 */

import { openDB } from 'idb';

const DB_NAME = 'InfinitePathsDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

/** Opens (and initializes) the IndexedDB database */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'slotName' });
        store.createIndex('savedAt', 'savedAt');
      }
    }
  });
}

/**
 * Saves game state to a named slot.
 * @param {string} slotName - Slot identifier (e.g., 'slot1', 'autosave')
 * @param {Object} gameState - Full game state to persist
 */
export async function saveGame(slotName, gameState) {
  const db = await getDB();
  const entry = {
    slotName,
    savedAt: new Date().toISOString(),
    scene: gameState.currentScene?.sceneType || 'unknown',
    location: gameState.currentScene?.location || 'unknown',
    completedScenes: gameState.worldState?.completedScenes || 0,
    data: gameState
  };
  await db.put(STORE_NAME, entry);
}

/**
 * Loads game state from a named slot.
 * @param {string} slotName
 * @returns {Promise<Object|null>} game state or null if slot doesn't exist
 */
export async function loadGame(slotName) {
  const db = await getDB();
  const entry = await db.get(STORE_NAME, slotName);
  return entry?.data ?? null;
}

/**
 * Lists all save slots with metadata.
 * @returns {Promise<Array>} array of save slot metadata objects
 */
export async function listSaves() {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all
    .map(({ slotName, savedAt, scene, location, completedScenes }) => ({
      slotName,
      savedAt,
      scene,
      location,
      completedScenes
    }))
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

/**
 * Deletes a save slot.
 * @param {string} slotName
 */
export async function deleteSave(slotName) {
  const db = await getDB();
  await db.delete(STORE_NAME, slotName);
}

/**
 * Autosaves the current game state.
 * @param {Object} gameState
 */
export async function autosave(gameState) {
  await saveGame('autosave', gameState);
}
