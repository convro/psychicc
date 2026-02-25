/**
 * App.jsx - Main game shell.
 * Orchestrates Three.js canvas, audio engine, story text, choices, and UI overlays.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from './store/gameStore.js';
import { AudioEngine } from './services/audioEngine.js';
import Scene3D from './components/Scene3D.jsx';
import StoryText from './components/StoryText.jsx';
import ChoiceButtons from './components/ChoiceButtons.jsx';
import WorldState from './components/WorldState.jsx';
import SaveLoadMenu from './components/SaveLoadMenu.jsx';

export default function App() {
  const audioEngineRef = useRef(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const { currentScene, isGenerating, error, startNewGame, makeChoice, clearError, goBack, sceneHistory } = useGameStore();

  // Initialize AudioEngine (lazy - requires user gesture first)
  function getAudio() {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine();
    }
    return audioEngineRef.current;
  }

  // Start audio on first user interaction (browser policy)
  async function startAudio() {
    const audio = getAudio();
    await audio.init();
    setAudioStarted(true);
  }

  // Update music whenever scene mood changes
  useEffect(() => {
    if (currentScene?.mood && audioStarted) {
      getAudio().changeMood(currentScene.mood);
    }
  }, [currentScene?.mood, audioStarted]);

  // Start game on mount if no saved scene
  useEffect(() => {
    if (!currentScene) {
      startNewGame();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup audio on unmount
  useEffect(() => {
    return () => audioEngineRef.current?.stop();
  }, []);

  // Handle choice - also ensure audio is started
  const handleChoice = useCallback(async (choiceId) => {
    if (!audioStarted) {
      await startAudio();
    }
    makeChoice(choiceId);
  }, [audioStarted, makeChoice]);

  // Handle intro dismissal
  const handleStartAdventure = useCallback(async () => {
    await startAudio();
    setShowIntro(false);
    if (!currentScene) {
      startNewGame();
    }
  }, [currentScene, startNewGame]);

  const completedScenes = useGameStore(s => s.worldState.completedScenes);
  const worldState = useGameStore(s => s.worldState);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col overflow-hidden select-none">

      {/* ── THREE.JS CANVAS (60% height) ─────────────────────────────────── */}
      <div className="relative flex-none" style={{ height: '60vh' }}>
        <Scene3D
          visualScene={currentScene?.visualScene}
        />

        {/* Scanline overlay for CRT effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
            zIndex: 1
          }}
        />

        {/* Top HUD bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-10">
          {/* Left: title + scene counter */}
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-mono font-bold text-sm tracking-widest uppercase">
              Infinite Paths
            </span>
            <span className="text-gray-600 font-mono text-xs">
              ■ Scene {completedScenes}
            </span>
            {currentScene?.location && (
              <span className="text-gray-700 font-mono text-xs truncate max-w-[200px]">
                / {currentScene.location}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Audio toggle */}
            <button
              onClick={() => audioStarted ? getAudio().stop() : startAudio()}
              className="bg-black/60 border border-gray-800 px-3 py-1 rounded font-mono text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
              title={audioStarted ? 'Mute audio' : 'Enable audio'}
            >
              {audioStarted ? '♪ ON' : '♪ OFF'}
            </button>

            {/* Undo */}
            {sceneHistory.length > 0 && (
              <button
                onClick={goBack}
                disabled={isGenerating}
                className="bg-black/60 border border-gray-800 px-3 py-1 rounded font-mono text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors disabled:opacity-40"
                title="Go back one scene"
              >
                ↩ Back
              </button>
            )}

            {/* Save/Load */}
            <button
              onClick={() => setShowSaveLoad(true)}
              className="bg-black/60 border border-gray-800 px-3 py-1 rounded font-mono text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
            >
              ◈ Save
            </button>

            {/* Debug toggle */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`bg-black/60 border px-3 py-1 rounded font-mono text-xs transition-colors ${
                showDebug
                  ? 'border-cyan-800 text-cyan-600'
                  : 'border-gray-800 text-gray-600 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              {showDebug ? '✕ Debug' : '◉ Debug'}
            </button>

            {/* New game */}
            <button
              onClick={() => {
                if (confirm('Start a new game? Current progress will be lost.')) {
                  startNewGame();
                }
              }}
              disabled={isGenerating}
              className="bg-black/60 border border-red-900 px-3 py-1 rounded font-mono text-xs text-red-700 hover:text-red-400 hover:border-red-700 transition-colors disabled:opacity-40"
            >
              ↺ New
            </button>
          </div>
        </div>

        {/* Mood indicator stripe at bottom of canvas */}
        {currentScene && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10">
            <div
              className="h-full transition-all duration-1000"
              style={{
                background: {
                  tense:      'linear-gradient(90deg, #ff0040, #ff4060, #ff0040)',
                  calm:       'linear-gradient(90deg, #0066ff, #00aaff, #0066ff)',
                  mysterious: 'linear-gradient(90deg, #6600cc, #aa00ff, #6600cc)',
                  action:     'linear-gradient(90deg, #ff6600, #ffaa00, #ff6600)',
                  horror:     'linear-gradient(90deg, #660000, #aa0000, #660000)'
                }[currentScene.mood] || 'transparent',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          </div>
        )}
      </div>

      {/* ── STORY UI (40% height) ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0" style={{ height: '40vh' }}>
        {/* Main story panel */}
        <div className="flex-1 min-w-0 flex flex-col border-t border-gray-900">
          {/* Narrative + choices area */}
          <div className="flex-1 overflow-y-auto p-5">
            <StoryText scene={currentScene} />
            {!isGenerating && (
              <ChoiceButtons
                choices={currentScene?.choices || []}
                onChoice={handleChoice}
                disabled={isGenerating}
              />
            )}
          </div>

          {/* Error bar */}
          {error && (
            <div className="px-5 py-2 bg-red-950/50 border-t border-red-900 flex items-center justify-between">
              <span className="text-red-400 font-mono text-xs">{error}</span>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Player info footer */}
          <div className="shrink-0 px-5 py-2 border-t border-gray-900 flex items-center gap-4 text-xs font-mono text-gray-700">
            <span>
              <span className="text-gray-600">Player:</span>{' '}
              <span className="text-cyan-800">{worldState.playerName}</span>
            </span>
            <span>
              <span className="text-gray-600">Inv:</span>{' '}
              {worldState.inventory.slice(0, 3).join(', ')}
              {worldState.inventory.length > 3 && ' ...'}
            </span>
            <span className="ml-auto">
              <span className="text-gray-600">Street rep:</span>{' '}
              <span className={worldState.reputation.street >= 0 ? 'text-green-800' : 'text-red-800'}>
                {worldState.reputation.street > 0 ? '+' : ''}{worldState.reputation.street}
              </span>
            </span>
          </div>
        </div>

        {/* Debug panel (collapsible) */}
        {showDebug && (
          <div className="w-72 shrink-0 bg-gray-950 border-l border-t border-gray-800 p-3 overflow-hidden">
            <WorldState />
          </div>
        )}
      </div>

      {/* ── LOADING OVERLAY ───────────────────────────────────────────────── */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="font-mono text-center space-y-3">
            <div className="text-2xl text-cyan-400 animate-pulse">
              {currentScene ? 'Generating next scene...' : 'Initializing narrative engine...'}
            </div>
            <div className="text-gray-600 text-sm">
              DeepSeek is weaving your story
            </div>
            {/* Animated dots */}
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── INTRO / SPLASH SCREEN ─────────────────────────────────────────── */}
      {showIntro && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-40 p-8">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(90deg, #00ffff 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative text-center space-y-6 max-w-lg">
            <div className="text-xs font-mono text-cyan-800 tracking-widest uppercase mb-2">
              Neo-Tokyo · 2077
            </div>

            <h1 className="text-5xl font-bold font-mono tracking-widest uppercase">
              <span className="text-cyan-400" style={{ textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff' }}>
                Infinite
              </span>
              <br />
              <span className="text-white">Paths</span>
            </h1>

            <p className="text-gray-500 font-mono text-sm leading-relaxed">
              An AI-driven interactive story.<br />
              Every choice shapes the world.<br />
              No path is ever the same.
            </p>

            <div className="space-y-2 text-xs font-mono text-gray-700">
              <div>◈ AI Narrative: DeepSeek Reasoner</div>
              <div>◈ 3D World: Three.js</div>
              <div>◈ Adaptive Music: Tone.js</div>
            </div>

            <button
              onClick={handleStartAdventure}
              className="mt-4 px-8 py-3 border border-cyan-600 text-cyan-400 font-mono font-bold tracking-widest uppercase rounded hover:bg-cyan-900/30 hover:border-cyan-400 transition-all duration-300 text-sm"
              style={{ textShadow: '0 0 10px #00ffff' }}
            >
              ▶ Enter the Matrix
            </button>

            <div className="text-xs text-gray-800 font-mono mt-4">
              Add VITE_DEEPSEEK_API_KEY to .env to enable AI generation
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE/LOAD MODAL ───────────────────────────────────────────────── */}
      {showSaveLoad && (
        <SaveLoadMenu onClose={() => setShowSaveLoad(false)} />
      )}
    </div>
  );
}
