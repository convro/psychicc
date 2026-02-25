/**
 * ChoiceButtons - Renders player choice options with cyberpunk styling.
 * Disabled during scene generation to prevent double-submissions.
 */

import React, { useState } from 'react';

export default function ChoiceButtons({ choices, onChoice, disabled }) {
  const [selectedId, setSelectedId] = useState(null);

  // Reset selection when choices change (new scene)
  React.useEffect(() => {
    setSelectedId(null);
  }, [choices]);

  if (!choices || choices.length === 0) return null;

  const handleChoice = (choice) => {
    if (disabled || selectedId !== null) return;
    setSelectedId(choice.id);
    onChoice(choice.id);
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
        ─── Select action ───
      </div>

      {choices.map((choice, index) => {
        const isSelected = selectedId === choice.id;
        const isOtherSelected = selectedId !== null && !isSelected;

        return (
          <button
            key={choice.id}
            onClick={() => handleChoice(choice)}
            disabled={disabled || isOtherSelected}
            className={`
              w-full text-left px-4 py-3 rounded border font-mono text-sm
              transition-all duration-200 group relative overflow-hidden
              ${isSelected
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                : isOtherSelected || disabled
                  ? 'border-gray-800 bg-transparent text-gray-700 cursor-not-allowed opacity-40'
                  : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-200 cursor-pointer'
              }
            `}
          >
            {/* Animated left border on hover */}
            {!disabled && !isOtherSelected && (
              <span
                className={`
                  absolute left-0 top-0 h-full w-0.5 transition-all duration-200
                  ${isSelected ? 'bg-cyan-400' : 'bg-transparent group-hover:bg-cyan-600'}
                `}
              />
            )}

            <span className="flex items-start gap-3">
              {/* Choice number */}
              <span className={`
                text-xs mt-0.5 font-bold shrink-0
                ${isSelected ? 'text-cyan-400' : 'text-gray-600 group-hover:text-cyan-700'}
              `}>
                {String.fromCharCode(65 + index)}.
              </span>

              {/* Choice text */}
              <span className="leading-relaxed">{choice.text}</span>

              {/* Loading spinner if this choice was selected */}
              {isSelected && disabled && (
                <span className="ml-auto shrink-0 text-cyan-400 animate-spin">⟳</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
