/**
 * StoryText - Renders the scene narrative with cyberpunk styling.
 * Animates text in line by line for immersion.
 */

import React, { useState, useEffect, useRef } from 'react';

export default function StoryText({ scene }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef(null);
  const prevNarrativeRef = useRef('');

  useEffect(() => {
    if (!scene?.narrative) return;
    if (scene.narrative === prevNarrativeRef.current) return;

    prevNarrativeRef.current = scene.narrative;
    setDisplayedText('');
    setIsTyping(true);

    // Clear previous interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Typewriter effect: reveal text character by character
    let i = 0;
    const text = scene.narrative;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, 18); // ~55 chars/sec

    return () => clearInterval(intervalRef.current);
  }, [scene?.narrative]);

  if (!scene) {
    return (
      <div className="text-gray-600 italic text-sm animate-pulse">
        Initializing narrative engine...
      </div>
    );
  }

  const moodColors = {
    tense:       'text-red-400',
    calm:        'text-blue-300',
    mysterious:  'text-purple-300',
    action:      'text-orange-400',
    horror:      'text-red-600'
  };

  const sceneTypeIcons = {
    combat:      '⚔',
    dialogue:    '💬',
    exploration: '🔍',
    decision:    '⚡'
  };

  return (
    <div className="space-y-3">
      {/* Scene metadata bar */}
      <div className="flex items-center gap-3 text-xs font-mono text-gray-500 border-b border-gray-800 pb-2">
        <span className={`${moodColors[scene.mood] || 'text-gray-400'} uppercase tracking-widest`}>
          {scene.mood}
        </span>
        <span className="text-gray-700">|</span>
        <span className="text-gray-500">
          {sceneTypeIcons[scene.sceneType] || '◈'} {scene.sceneType}
        </span>
        <span className="text-gray-700">|</span>
        <span className="text-cyan-700 truncate max-w-[180px]">
          {scene.location}
        </span>
        {isTyping && (
          <span className="ml-auto text-green-500 animate-pulse">■</span>
        )}
      </div>

      {/* Main narrative */}
      <div
        className="font-mono text-sm leading-relaxed text-gray-200 min-h-[80px]"
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {displayedText}
        {isTyping && (
          <span className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
