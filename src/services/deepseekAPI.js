/**
 * DeepSeek Reasoner API integration.
 * Handles scene generation with retry logic and response validation.
 */

import { SYSTEM_PROMPT, INITIAL_SCENE_PROMPT, buildContinuationPrompt } from '../utils/promptBuilder.js';
import { parseAIResponse, validateScene } from '../utils/stateValidator.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Gets the API key from environment variables.
 * @returns {string}
 */
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
 * Calls the DeepSeek API with a given prompt.
 * @param {string} userPrompt
 * @param {number} retries - Number of retry attempts on failure
 * @returns {Promise<string>} raw response text
 */
async function callDeepSeek(userPrompt, retries = 2) {
  const apiKey = getApiKey();

  const body = {
    model: 'deepseek-reasoner',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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

      // DeepSeek Reasoner returns content in choices[0].message.content
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from DeepSeek API');
      }

      return content;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Generates the initial scene when the game starts.
 * @returns {Promise<Object>} validated scene object
 */
export async function generateInitialScene() {
  const rawText = await callDeepSeek(INITIAL_SCENE_PROMPT);
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
 * Generates the next scene based on player choice and current world state.
 * @param {Object} worldState - Current game world state
 * @param {Object} choice - Player's chosen option
 * @returns {Promise<Object>} validated scene object
 */
export async function generateNextScene(worldState, choice) {
  const prompt = buildContinuationPrompt(worldState, choice);
  const rawText = await callDeepSeek(prompt);
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
