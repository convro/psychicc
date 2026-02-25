/**
 * WorldState - Debug panel showing full game state.
 * Useful for verifying AI consistency and world state tracking.
 */

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';

export default function WorldState() {
  const { worldState, currentScene, sceneHistory } = useGameStore();
  const [activeTab, setActiveTab] = useState('world');

  const tabs = [
    { id: 'world', label: 'World' },
    { id: 'scene', label: 'Scene' },
    { id: 'history', label: `History (${sceneHistory.length})` }
  ];

  return (
    <div className="text-xs font-mono h-full flex flex-col">
      <div className="text-cyan-500 font-bold text-sm mb-3 uppercase tracking-widest">
        ◈ Debug Panel
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-900 text-cyan-300 border border-cyan-700'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 space-y-3">
        {activeTab === 'world' && (
          <>
            {/* Inventory */}
            <Section title="Inventory">
              {worldState.inventory.length === 0
                ? <span className="text-gray-600">Empty</span>
                : worldState.inventory.map(item => (
                    <div key={item} className="text-green-400">▸ {item}</div>
                  ))
              }
            </Section>

            {/* Reputation */}
            <Section title="Reputation">
              {Object.entries(worldState.reputation).map(([faction, value]) => (
                <div key={faction} className="flex items-center gap-2">
                  <span className="text-gray-400 capitalize w-20">{faction}:</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        value >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.abs(value)}%`, marginLeft: value < 0 ? `${100 - Math.abs(value)}%` : 0 }}
                    />
                  </div>
                  <span className={`w-8 text-right ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {value > 0 ? '+' : ''}{value}
                  </span>
                </div>
              ))}
            </Section>

            {/* Relationships */}
            <Section title="Relationships">
              {Object.keys(worldState.relationships).length === 0
                ? <span className="text-gray-600">None established</span>
                : Object.entries(worldState.relationships).map(([name, status]) => (
                    <div key={name}>
                      <span className="text-yellow-400">{name}:</span>
                      <span className="text-gray-400 ml-2">{status}</span>
                    </div>
                  ))
              }
            </Section>

            {/* Active Facts */}
            <Section title={`Known Facts (${worldState.activeFacts.length})`}>
              {worldState.activeFacts.map((fact, i) => (
                <div key={i} className="text-gray-400 text-[10px] leading-relaxed">
                  {i + 1}. {fact}
                </div>
              ))}
            </Section>
          </>
        )}

        {activeTab === 'scene' && currentScene && (
          <>
            <Section title="Current Scene">
              <div><span className="text-gray-500">Type:</span> <span className="text-cyan-400">{currentScene.sceneType}</span></div>
              <div><span className="text-gray-500">Mood:</span> <span className="text-purple-400">{currentScene.mood}</span></div>
              <div><span className="text-gray-500">Location:</span> <span className="text-yellow-400">{currentScene.location}</span></div>
            </Section>

            {currentScene.visualScene && (
              <Section title="Visual Data">
                <div><span className="text-gray-500">Env:</span> {currentScene.visualScene.environment}</div>
                <div><span className="text-gray-500">Lighting:</span> {currentScene.visualScene.lighting}</div>
                <div><span className="text-gray-500">Objects:</span> {currentScene.visualScene.objects?.join(', ') || 'none'}</div>
              </Section>
            )}

            <Section title="Available Choices">
              {currentScene.choices?.map(c => (
                <div key={c.id} className="text-gray-400 text-[10px] mb-1">
                  <span className="text-cyan-600">[{c.id}]</span> {c.text}
                </div>
              ))}
            </Section>
          </>
        )}

        {activeTab === 'history' && (
          <Section title={`Scene History (${sceneHistory.length} scenes)`}>
            {sceneHistory.length === 0
              ? <span className="text-gray-600">No history yet</span>
              : [...sceneHistory].reverse().map((scene, i) => (
                  <div key={i} className="border-b border-gray-800 pb-2 mb-2">
                    <div className="text-cyan-600">{sceneHistory.length - i}. {scene.location}</div>
                    {scene.playerChoice && (
                      <div className="text-green-600 text-[10px]">→ "{scene.playerChoice}"</div>
                    )}
                  </div>
                ))
            }
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-gray-600 uppercase tracking-widest text-[9px] mb-1 border-b border-gray-800 pb-1">
        {title}
      </div>
      <div className="space-y-1 pl-1">{children}</div>
    </div>
  );
}
