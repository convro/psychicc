/**
 * App.jsx - Main game shell.
 * Multi-step intro (language → settings → game), 3D canvas, story UI.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from './store/gameStore.js';
import { AudioEngine } from './services/audioEngine.js';
import Scene3D from './components/Scene3D.jsx';
import StoryText from './components/StoryText.jsx';
import ChoiceButtons from './components/ChoiceButtons.jsx';
import WorldState from './components/WorldState.jsx';
import SaveLoadMenu from './components/SaveLoadMenu.jsx';

// ── UI strings (PL / EN) ────────────────────────────────────────────────────
const L = {
  pl: {
    title: 'Nieskończone Ścieżki',
    subtitle: 'Neo-Tokyo · 2077',
    tagline: 'Narracja generowana przez AI.\nKażdy wybór kształtuje świat.\nŻadna ścieżka nie jest taka sama.',
    pickLang: 'Wybierz język narracji',
    settingsTitle: 'Ustawienia personalne',
    settingsHint: 'Dostosuj klimat i intensywność gry',
    customThemeLabel: 'Własny temat gry (opcjonalnie)',
    customThemePlaceholder: 'np. "western", "horror w szpitalu", "kosmiczna opera", "średniowieczne fantasy"...',
    sliders: {
      brutality: 'Brutalność',
      action:    'Akcja',
      profanity: 'Język',
      darkness:  'Mroczność',
    },
    sliderDesc: {
      brutality: 'Poziom przemocy i jej opisu',
      action:    'Częstość zdarzeń i twistów',
      profanity: 'Mocne słownictwo i przekleństwa',
      darkness:  'Nihilizm i beznadziejność klimatu',
    },
    low:  { brutality: 'Łagodna', action: 'Spokojna', profanity: 'Kulturalny', darkness: 'Jasna' },
    high: { brutality: 'Ekstremalna', action: 'Chaotyczna', profanity: 'Wulgarny', darkness: 'Beznadziejna' },
    startBtn: '▶ Rozpocznij przygodę',
    backBtn:  '← Wróć',
    generating:    'Generowanie sceny...',
    initializing:  'Inicjalizacja silnika narracji...',
    aiWeaving:     'DeepSeek tworzy twoją historię',
    sceneLabel:    'Scena',
    playerLabel:   'Gracz',
    invLabel:      'Ekw',
    repLabel:      'Rep. ulicy',
    audioOn:  '♪ WŁ',
    audioOff: '♪ WYŁ',
    back:    '↩ Cofnij',
    save:    '◈ Zapis',
    newBtn:  '↺ Nowa',
    newGameConfirm: 'Nowa gra? Stracisz postęp.',
    tech: ['◈ AI: DeepSeek Reasoner', '◈ 3D: Three.js', '◈ Audio: Tone.js'],
  },
  en: {
    title: 'Infinite Paths',
    subtitle: 'Neo-Tokyo · 2077',
    tagline: 'An AI-driven interactive story.\nEvery choice shapes the world.\nNo path is ever the same.',
    pickLang: 'Choose narrative language',
    settingsTitle: 'Personal Settings',
    settingsHint: 'Customize game atmosphere and intensity',
    customThemeLabel: 'Custom game theme (optional)',
    customThemePlaceholder: 'e.g. "wild west", "hospital horror", "space opera", "medieval fantasy"...',
    sliders: {
      brutality: 'Brutality',
      action:    'Action',
      profanity: 'Language',
      darkness:  'Darkness',
    },
    sliderDesc: {
      brutality: 'Level of violence and its description',
      action:    'Frequency of events and plot twists',
      profanity: 'Strength and frequency of swearing',
      darkness:  'Nihilism and hopelessness of the tone',
    },
    low:  { brutality: 'Mild', action: 'Calm', profanity: 'Clean', darkness: 'Light' },
    high: { brutality: 'Extreme', action: 'Chaotic', profanity: 'Vulgar', darkness: 'Hopeless' },
    startBtn: '▶ Begin adventure',
    backBtn:  '← Back',
    generating:   'Generating scene...',
    initializing: 'Initializing narrative engine...',
    aiWeaving:    'DeepSeek is weaving your story',
    sceneLabel:   'Scene',
    playerLabel:  'Player',
    invLabel:     'Inv',
    repLabel:     'Street rep',
    audioOn:  '♪ ON',
    audioOff: '♪ OFF',
    back:    '↩ Back',
    save:    '◈ Save',
    newBtn:  '↺ New',
    newGameConfirm: 'Start new game? Current progress will be lost.',
    tech: ['◈ AI: DeepSeek Reasoner', '◈ 3D: Three.js', '◈ Audio: Tone.js'],
  },
};

const SLIDER_COLORS = {
  brutality: '#ff2244',
  action:    '#ff8800',
  profanity: '#9900ff',
  darkness:  '#2255aa',
};

// ── Slider component ────────────────────────────────────────────────────────
function Slider({ name, value, onChange, lang }) {
  const t = L[lang];
  const color = SLIDER_COLORS[name];
  const pct = value;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-wider">{t.sliders[name]}</span>
          <span className="text-[10px] font-mono text-gray-600 ml-2 hidden sm:inline">{t.sliderDesc[name]}</span>
        </div>
        <span
          className="text-sm font-mono font-bold tabular-nums w-8 text-right"
          style={{ color, textShadow: `0 0 8px ${color}88` }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="100"
        value={value}
        onChange={e => onChange(name, parseInt(e.target.value))}
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #1a1a2e ${pct}%, #1a1a2e 100%)`,
        }}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] font-mono text-gray-700">
        <span>{t.low[name]}</span>
        <span>{t.high[name]}</span>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const audioEngineRef = useRef(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);

  // Intro step: 1=language 2=settings 0=in-game
  const [introStep, setIntroStep] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('infinite-paths-storage') || '{}');
      return stored?.state?.currentScene ? 0 : 1;
    } catch { return 1; }
  });
  const [stepping, setStepping] = useState(false); // transition animation

  const {
    currentScene, isGenerating, error,
    startNewGame, makeChoice, clearError, goBack, sceneHistory,
    gameSettings, setGameSettings
  } = useGameStore();

  const lang = gameSettings?.language || 'pl';
  const t = L[lang];

  // ── Audio helpers ──────────────────────────────────────────────────────────
  function getAudio() {
    if (!audioEngineRef.current) audioEngineRef.current = new AudioEngine();
    return audioEngineRef.current;
  }
  async function startAudio() {
    await getAudio().init();
    setAudioStarted(true);
  }

  useEffect(() => {
    if (currentScene?.mood && audioStarted) getAudio().changeMood(currentScene.mood);
  }, [currentScene?.mood, audioStarted]);

  useEffect(() => () => audioEngineRef.current?.stop(), []);

  // ── Choice handler ─────────────────────────────────────────────────────────
  const handleChoice = useCallback(async (choiceId) => {
    if (!audioStarted) await startAudio();
    makeChoice(choiceId);
  }, [audioStarted, makeChoice]);

  // ── Intro navigation (animated) ────────────────────────────────────────────
  const goToStep = (step) => {
    setStepping(true);
    setTimeout(() => { setIntroStep(step); setStepping(false); }, 220);
  };

  // ── Start adventure from intro ─────────────────────────────────────────────
  const handleStartAdventure = useCallback(async () => {
    await startAudio();
    startNewGame();
    goToStep(0);
  }, [startNewGame]);

  const handleSlider = (name, value) => setGameSettings({ [name]: value });

  const completedScenes = useGameStore(s => s.worldState.completedScenes);
  const worldState = useGameStore(s => s.worldState);
  const settings = gameSettings || {};

  // ── Mood stripe gradient ───────────────────────────────────────────────────
  const moodGradient = {
    tense:      'linear-gradient(90deg,#ff0040,#ff4060,#ff0040)',
    calm:       'linear-gradient(90deg,#0066ff,#00aaff,#0066ff)',
    mysterious: 'linear-gradient(90deg,#6600cc,#aa00ff,#6600cc)',
    action:     'linear-gradient(90deg,#ff6600,#ffaa00,#ff6600)',
    horror:     'linear-gradient(90deg,#660000,#aa0000,#660000)',
  };

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col overflow-hidden select-none">

      {/* ── THREE.JS CANVAS (55vh) ───────────────────────────────────────────── */}
      <div className="relative flex-none" style={{ height: '55vh' }}>
        <Scene3D visualScene={currentScene?.visualScene} />

        {/* CRT scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)',
            zIndex: 1
          }}
        />

        {/* Top HUD */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2"
          style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%)' }}
        >
          {/* Left: title + location */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span
              className="font-mono font-bold text-xs tracking-widest uppercase text-cyan-400 shrink-0"
              style={{ textShadow: '0 0 8px #00ffff' }}
            >
              {t.title}
            </span>
            <span className="font-mono text-xs text-gray-700 shrink-0">
              ■ {t.sceneLabel} {completedScenes}
            </span>
            {currentScene?.location && (
              <span className="font-mono text-xs text-gray-700 truncate hidden sm:block">
                / {currentScene.location}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => audioStarted ? getAudio().stop() : startAudio()}
              className="hud-btn"
            >
              {audioStarted ? t.audioOn : t.audioOff}
            </button>
            {sceneHistory.length > 0 && (
              <button onClick={goBack} disabled={isGenerating} className="hud-btn">
                {t.back}
              </button>
            )}
            <button onClick={() => setShowSaveLoad(true)} className="hud-btn">{t.save}</button>
            <button
              onClick={() => setShowDebug(d => !d)}
              className={`hud-btn ${showDebug ? 'text-cyan-500 !border-cyan-900' : ''}`}
            >
              {showDebug ? '✕' : '◉'}
            </button>
            <button
              onClick={() => { if (confirm(t.newGameConfirm)) goToStep(2); }}
              disabled={isGenerating}
              className="hud-btn !text-red-800 !border-red-900 hover:!text-red-500"
            >
              {t.newBtn}
            </button>
          </div>
        </div>

        {/* Mood stripe */}
        {currentScene && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10">
            <div
              className="h-full transition-all duration-1000"
              style={{ background: moodGradient[currentScene.mood] || 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* ── STORY UI (45vh) ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0" style={{ height: '45vh' }}>
        <div className="flex-1 min-w-0 flex flex-col border-t border-gray-900">

          {/* Narrative + choices */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <StoryText scene={currentScene} lang={lang} />
            {!isGenerating && currentScene && (
              <ChoiceButtons
                choices={currentScene.choices || []}
                onChoice={handleChoice}
                disabled={isGenerating}
              />
            )}
          </div>

          {/* Error bar */}
          {error && (
            <div className="px-4 py-2 bg-red-950/60 border-t border-red-900 flex items-center justify-between gap-2">
              <span className="text-red-400 font-mono text-xs truncate">{error}</span>
              <button onClick={clearError} className="text-red-600 hover:text-red-400 text-xs shrink-0">✕</button>
            </div>
          )}

          {/* Footer bar */}
          <div className="shrink-0 px-4 py-1.5 border-t border-gray-900 flex items-center gap-3 text-[11px] font-mono text-gray-700">
            <span className="shrink-0">
              <span className="text-gray-600">{t.playerLabel}:</span>{' '}
              <span className="text-cyan-800">{worldState.playerName}</span>
            </span>
            <span className="hidden sm:block truncate">
              <span className="text-gray-600">{t.invLabel}:</span>{' '}
              {worldState.inventory.slice(0, 3).join(', ')}
              {worldState.inventory.length > 3 && ' …'}
            </span>
            <span className="ml-auto shrink-0">
              <span className="text-gray-600">{t.repLabel}:</span>{' '}
              <span className={worldState.reputation.street >= 0 ? 'text-green-800' : 'text-red-800'}>
                {worldState.reputation.street > 0 ? '+' : ''}{worldState.reputation.street}
              </span>
            </span>
          </div>
        </div>

        {/* Debug panel */}
        {showDebug && (
          <div className="w-64 shrink-0 bg-gray-950 border-l border-t border-gray-800 p-2 overflow-hidden hidden sm:block">
            <WorldState />
          </div>
        )}
      </div>

      {/* ── LOADING OVERLAY ─────────────────────────────────────────────────── */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 pointer-events-none backdrop-blur-sm">
          <div className="font-mono text-center space-y-4 px-6">
            <div className="text-lg sm:text-2xl text-cyan-400 animate-pulse">
              {currentScene ? t.generating : t.initializing}
            </div>
            <div className="text-gray-600 text-xs sm:text-sm">{t.aiWeaving}</div>
            <div className="flex gap-2 justify-center">
              {[0,1,2,3,4].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── INTRO OVERLAY ───────────────────────────────────────────────────── */}
      {introStep > 0 && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto py-6"
          style={{ background: 'radial-gradient(ellipse at center,#040410 0%,#000 100%)' }}
        >
          {/* Grid bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(#00ffff 1px,transparent 1px),linear-gradient(90deg,#00ffff 1px,transparent 1px)',
              backgroundSize: '40px 40px',
              opacity: 0.04,
            }}
          />

          <div
            className={`relative w-full max-w-md mx-4 transition-all duration-200 ${stepping ? 'opacity-0 translate-x-6' : 'opacity-100 translate-x-0'}`}
          >
            {/* ── Step 1: Language ─────────────────────────────────────────── */}
            {introStep === 1 && (
              <div className="text-center space-y-8">
                {/* Title */}
                <div>
                  <div className="text-[10px] font-mono text-cyan-900 tracking-widest uppercase mb-3">
                    {L.en.subtitle}
                  </div>
                  <h1 className="text-5xl font-bold font-mono tracking-widest uppercase leading-none">
                    <span
                      className="text-cyan-400 block"
                      style={{ textShadow: '0 0 20px #00ffff,0 0 50px #00ffff66' }}
                    >
                      INFINITE
                    </span>
                    <span className="text-white block">PATHS</span>
                  </h1>
                </div>

                <p className="text-gray-500 font-mono text-xs leading-relaxed whitespace-pre-line">
                  {L.en.tagline}
                </p>

                {/* Language buttons */}
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-4">
                    {L.en.pickLang} / {L.pl.pickLang}
                  </p>
                  <div className="flex gap-3">
                    {[
                      { code: 'pl', flag: '🇵🇱', name: 'Polski',  sub: 'Narracja po polsku' },
                      { code: 'en', flag: '🇬🇧', name: 'English', sub: 'Narrative in English' },
                    ].map(({ code, flag, name, sub }) => (
                      <button
                        key={code}
                        onClick={() => { setGameSettings({ language: code }); goToStep(2); }}
                        className="flex-1 py-4 px-3 border border-gray-800 rounded-lg font-mono hover:border-cyan-700 hover:bg-cyan-950/30 transition-all duration-200 group"
                      >
                        <div className="text-2xl mb-1">{flag}</div>
                        <div className="text-sm text-gray-300 group-hover:text-cyan-300">{name}</div>
                        <div className="text-[10px] text-gray-700 group-hover:text-gray-500 mt-0.5">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-gray-800 space-y-0.5">
                  {L.en.tech.map(s => <div key={s}>{s}</div>)}
                </div>
              </div>
            )}

            {/* ── Step 2: Settings ─────────────────────────────────────────── */}
            {introStep === 2 && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2
                    className="text-lg font-bold font-mono uppercase tracking-widest text-cyan-400"
                    style={{ textShadow: '0 0 12px #00ffff66' }}
                  >
                    {t.settingsTitle}
                  </h2>
                  <p className="text-gray-600 font-mono text-xs mt-1">{t.settingsHint}</p>
                </div>

                {/* Custom theme */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    {t.customThemeLabel}
                  </label>
                  <textarea
                    value={settings.customTheme || ''}
                    onChange={e => setGameSettings({ customTheme: e.target.value })}
                    placeholder={t.customThemePlaceholder}
                    rows={2}
                    className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm font-mono text-gray-300 placeholder-gray-800 focus:outline-none focus:border-cyan-800 resize-none transition-colors"
                  />
                </div>

                {/* Sliders */}
                <div className="space-y-5 p-4 bg-gray-950/70 border border-gray-800 rounded-lg">
                  {['brutality', 'action', 'profanity', 'darkness'].map(key => (
                    <Slider
                      key={key}
                      name={key}
                      value={settings[key] ?? 50}
                      onChange={handleSlider}
                      lang={lang}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => goToStep(1)}
                    className="px-4 py-2.5 border border-gray-800 text-gray-600 font-mono text-xs rounded-md hover:border-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {t.backBtn}
                  </button>
                  <button
                    onClick={handleStartAdventure}
                    className="flex-1 py-2.5 border border-cyan-700 text-cyan-400 font-mono font-bold tracking-widest uppercase rounded-md hover:bg-cyan-950/40 hover:border-cyan-500 transition-all duration-200 text-sm"
                    style={{ textShadow: '0 0 8px #00ffff66' }}
                  >
                    {t.startBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SAVE/LOAD MODAL ─────────────────────────────────────────────────── */}
      {showSaveLoad && <SaveLoadMenu onClose={() => setShowSaveLoad(false)} />}
    </div>
  );
}
