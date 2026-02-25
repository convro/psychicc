/**
 * Scene3D - Wrapper component for the Three.js canvas.
 * Manages SceneGenerator lifecycle and forwards visual data.
 */

import React, { useEffect, useRef } from 'react';
import { SceneGenerator } from '../scenes/sceneGenerator.js';

export default function Scene3D({ visualScene, onReady }) {
  const canvasRef = useRef(null);
  const generatorRef = useRef(null);

  // Initialize SceneGenerator once
  useEffect(() => {
    if (!canvasRef.current || generatorRef.current) return;

    // Small delay to ensure canvas has painted and has real dimensions
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        generatorRef.current = new SceneGenerator(canvasRef.current);
        onReady?.(generatorRef.current);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [onReady]);

  // Update scene when visual data changes
  useEffect(() => {
    if (generatorRef.current && visualScene) {
      generatorRef.current.generateScene(visualScene);
    }
  }, [visualScene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      generatorRef.current?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
}
