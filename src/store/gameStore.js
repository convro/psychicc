/**
 * Zustand global game state store.
 * Manages scene progression, world state, save operations, and game settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateInitialScene, generateNextScene } from '../services/deepseekAPI.js';
import { applyWorldStateUpdates } from '../utils/stateValidator.js';
import { autosave } from '../services/saveSystem.js';

const INITIAL_WORLD_STATE = {
  genre: 'cyberpunk',
  playerName: 'Ghost',
  inventory: ['commlink', 'credstick'],
  reputation: {
    megacorps: 0,
    street: 50,
    police: -20
  },
  relationships: {},
  activeFacts: [
    'Player is a freelance netrunner',
    'Player operates in Neo-Tokyo District 7',
    'Player lives alone in a cramped apartment',
    'Year is 2077'
  ],
  currentLocation: 'Apartment - Neo-Tokyo District 7',
  completedScenes: 0
};

export const INITIAL_GAME_SETTINGS = {
  language: 'pl',
  customTheme: '',
  brutality: 50,
  action: 50,
  profanity: 30,
  darkness: 50,
};

export const useGameStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────────
      currentScene: null,
      worldState: { ...INITIAL_WORLD_STATE },
      sceneHistory: [],
      isGenerating: false,
      error: null,
      gameSettings: { ...INITIAL_GAME_SETTINGS },

      // ── Actions ────────────────────────────────────────────────────────────

      /** Update game settings (partial update) */
      setGameSettings: (settings) => {
        set(state => ({ gameSettings: { ...state.gameSettings, ...settings } }));
      },

      /**
       * Start a new game: reset state and generate opening scene.
       */
      startNewGame: async () => {
        const { gameSettings } = get();
        set({ isGenerating: true, error: null, currentScene: null, sceneHistory: [] });

        try {
          const initialScene = await generateInitialScene(gameSettings);

          const freshWorldState = {
            ...INITIAL_WORLD_STATE,
            ...(initialScene.worldStateUpdates
              ? {
                  activeFacts: [
                    ...INITIAL_WORLD_STATE.activeFacts,
                    ...(initialScene.worldStateUpdates.newFacts || [])
                  ],
                  currentLocation: initialScene.location || INITIAL_WORLD_STATE.currentLocation
                }
              : {})
          };

          set({
            currentScene: initialScene,
            worldState: freshWorldState,
            sceneHistory: [],
            isGenerating: false,
            error: null
          });

          autosave(get()).catch(console.warn);
        } catch (err) {
          console.error('[gameStore] startNewGame failed:', err);
          set({
            isGenerating: false,
            error: `Failed to start game: ${err.message}`
          });
        }
      },

      /**
       * Player makes a choice - generates next scene.
       * @param {number} choiceId
       */
      makeChoice: async (choiceId) => {
        const { currentScene, worldState, sceneHistory, gameSettings } = get();
        if (!currentScene) return;

        const choice = currentScene.choices.find(c => c.id === choiceId);
        if (!choice) {
          console.error(`Choice ${choiceId} not found in current scene`);
          return;
        }

        set({ isGenerating: true, error: null });

        try {
          const nextScene = await generateNextScene(worldState, choice, gameSettings);

          const updatedWorldState = applyWorldStateUpdates(
            worldState,
            nextScene.worldStateUpdates || {},
            nextScene.location
          );

          const newHistory = [...sceneHistory, {
            ...currentScene,
            playerChoice: choice.text
          }];

          set({
            currentScene: nextScene,
            worldState: updatedWorldState,
            sceneHistory: newHistory,
            isGenerating: false,
            error: null
          });

          autosave(get()).catch(console.warn);
        } catch (err) {
          console.error('[gameStore] makeChoice failed:', err);
          set({
            isGenerating: false,
            error: `Scene generation failed: ${err.message}`
          });
        }
      },

      /**
       * Save game to a named slot.
       * @param {string} slotName
       */
      saveToSlot: async (slotName) => {
        const { saveGame } = await import('../services/saveSystem.js');
        await saveGame(slotName, get());
      },

      /**
       * Load game from a named slot.
       * @param {string} slotName
       * @returns {Promise<boolean>}
       */
      loadFromSlot: async (slotName) => {
        const { loadGame } = await import('../services/saveSystem.js');
        const saveData = await loadGame(slotName);
        if (!saveData) return false;

        set({
          currentScene: saveData.currentScene,
          worldState: saveData.worldState,
          sceneHistory: saveData.sceneHistory || [],
          isGenerating: false,
          error: null
        });
        return true;
      },

      /** Clear any error state */
      clearError: () => set({ error: null }),

      /** Go back one scene (undo) */
      goBack: () => {
        const { sceneHistory } = get();
        if (sceneHistory.length === 0) return;

        const previousScenes = [...sceneHistory];
        const prevScene = previousScenes.pop();

        set({
          currentScene: prevScene,
          sceneHistory: previousScenes
        });
      }
    }),
    {
      name: 'infinite-paths-storage',
      partialize: (state) => ({
        currentScene: state.currentScene,
        worldState: state.worldState,
        sceneHistory: state.sceneHistory,
        gameSettings: state.gameSettings
      })
    }
  )
);
