/**
 * SaveLoadMenu - Modal for saving and loading game state via IndexedDB.
 */

import React, { useState, useEffect } from 'react';
import { listSaves, deleteSave } from '../services/saveSystem.js';
import { useGameStore } from '../store/gameStore.js';

const SAVE_SLOTS = ['slot1', 'slot2', 'slot3'];

export default function SaveLoadMenu({ onClose }) {
  const [saves, setSaves] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [mode, setMode] = useState('save'); // 'save' | 'load'
  const [status, setStatus] = useState('');

  const { saveToSlot, loadFromSlot, worldState, currentScene } = useGameStore();

  useEffect(() => {
    refreshSaves();
  }, []);

  async function refreshSaves() {
    const list = await listSaves();
    setSaves(list);
  }

  async function handleSave(slotName) {
    setActiveSlot(slotName);
    try {
      await saveToSlot(slotName);
      setStatus(`Saved to ${slotName}`);
      await refreshSaves();
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    }
    setActiveSlot(null);
  }

  async function handleLoad(slotName) {
    setActiveSlot(slotName);
    try {
      const ok = await loadFromSlot(slotName);
      if (ok) {
        setStatus(`Loaded ${slotName}`);
        setTimeout(onClose, 800);
      } else {
        setStatus(`Slot ${slotName} is empty`);
      }
    } catch (err) {
      setStatus(`Load failed: ${err.message}`);
    }
    setActiveSlot(null);
  }

  async function handleDelete(slotName) {
    await deleteSave(slotName);
    setStatus(`Deleted ${slotName}`);
    await refreshSaves();
  }

  function getSaveData(slotName) {
    return saves.find(s => s.slotName === slotName);
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString();
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-cyan-900 rounded-lg w-full max-w-md font-mono">
        {/* Header */}
        <div className="border-b border-cyan-900 p-4 flex items-center justify-between">
          <div className="text-cyan-400 font-bold tracking-widest uppercase">
            ◈ Save / Load
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-800">
          {['save', 'load'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm uppercase tracking-wider transition-colors ${
                mode === m
                  ? 'bg-cyan-900/30 text-cyan-300 border-b-2 border-cyan-500'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Current game info (for save mode) */}
        {mode === 'save' && currentScene && (
          <div className="p-3 bg-gray-900/50 text-xs text-gray-500 border-b border-gray-800">
            <span className="text-gray-400">Current:</span>{' '}
            {currentScene.location} · Scene {worldState.completedScenes}
          </div>
        )}

        {/* Save slots */}
        <div className="p-4 space-y-3">
          {SAVE_SLOTS.map(slotName => {
            const saveData = getSaveData(slotName);
            const isEmpty = !saveData;

            return (
              <div
                key={slotName}
                className="border border-gray-800 rounded p-3 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                      {slotName.replace('slot', 'Slot ')}
                    </div>
                    {isEmpty ? (
                      <div className="text-gray-700 text-xs italic">Empty slot</div>
                    ) : (
                      <div className="text-xs space-y-0.5">
                        <div className="text-cyan-600 truncate">{saveData.location}</div>
                        <div className="text-gray-600">Scene {saveData.completedScenes}</div>
                        <div className="text-gray-700">{formatDate(saveData.savedAt)}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {mode === 'save' && (
                      <button
                        onClick={() => handleSave(slotName)}
                        disabled={activeSlot === slotName}
                        className="px-3 py-1 bg-cyan-900/50 text-cyan-300 border border-cyan-800 rounded text-xs hover:bg-cyan-800/50 disabled:opacity-50 transition-colors"
                      >
                        {activeSlot === slotName ? '...' : 'Save'}
                      </button>
                    )}
                    {mode === 'load' && !isEmpty && (
                      <button
                        onClick={() => handleLoad(slotName)}
                        disabled={activeSlot === slotName}
                        className="px-3 py-1 bg-green-900/50 text-green-300 border border-green-800 rounded text-xs hover:bg-green-800/50 disabled:opacity-50 transition-colors"
                      >
                        {activeSlot === slotName ? '...' : 'Load'}
                      </button>
                    )}
                    {!isEmpty && (
                      <button
                        onClick={() => handleDelete(slotName)}
                        className="px-3 py-1 bg-red-900/20 text-red-700 border border-red-900/50 rounded text-xs hover:bg-red-900/40 transition-colors"
                      >
                        Del
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        {status && (
          <div className="px-4 pb-4 text-xs text-green-400 font-mono">{status}</div>
        )}

        {/* Autosave info */}
        <div className="px-4 pb-4 text-xs text-gray-700">
          Game autosaves after each scene choice.
        </div>
      </div>
    </div>
  );
}
