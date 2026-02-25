/**
 * DeepSeek Reasoner API integration.
 * Handles scene generation with retry logic and response validation.
 */

import { buildSystemPrompt, buildInitialScenePrompt, buildContinuationPrompt } from '../utils/promptBuilder.js';
import { parseAIResponse, validateScene } from '../utils/stateValidator.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function getApiKey() {
  const key = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error(
      'VITE_DEEPSEEK_API_KEY is not set. Create a .env file with your DeepSeek API key.'
    );
  }
  return key;
}

/**
 * Calls the DeepSeek API.
 * @param {string} userPrompt
 * @param {Object} settings - Game settings for dynamic system prompt
 * @param {number} retries
 * @returns {Promise<string>}
 */
async function callDeepSeek(userPrompt, settings = {}, retries = 2) {
  const apiKey = getApiKey();
  const systemPrompt = buildSystemPrompt(settings);

  const body = {
    model: 'deepseek-reasoner',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: 2000
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from DeepSeek API');
      }

      return content;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Generates the initial scene when the game starts.
 * @param {Object} settings - Game settings
 * @returns {Promise<Object>}
 */
export async function generateInitialScene(settings = {}) {
  const prompt = buildInitialScenePrompt(settings);
  const rawText = await callDeepSeek(prompt, settings);
  const parsed = parseAIResponse(rawText);
  const { valid, scene, errors } = validateScene(parsed);

  if (!valid) {
    console.warn('Initial scene validation warnings:', errors);
  }

  if (!scene) {
    throw new Error('Failed to generate valid initial scene from AI response');
  }

  return scene;
}

/**
 * Generates the next scene based on player choice and world state.
 * @param {Object} worldState
 * @param {Object} choice
 * @param {Object} settings - Game settings
 * @returns {Promise<Object>}
 */
export async function generateNextScene(worldState, choice, settings = {}) {
  const prompt = buildContinuationPrompt(worldState, choice, settings);
  const rawText = await callDeepSeek(prompt, settings);
  const parsed = parseAIResponse(rawText);
  const { valid, scene, errors } = validateScene(parsed);

  if (!valid) {
    console.warn('Scene validation warnings:', errors);
  }

  if (!scene) {
    throw new Error('Failed to generate valid scene from AI response');
  }

  return scene;
}
