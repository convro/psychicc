/**
 * Validates and sanitizes DeepSeek API responses to ensure consistency.
 * Falls back to safe defaults when the AI returns malformed data.
 */

const VALID_SCENE_TYPES = new Set(['combat', 'dialogue', 'exploration', 'decision']);
const VALID_MOODS = new Set(['tense', 'calm', 'mysterious', 'action', 'horror']);
const VALID_ENVIRONMENTS = new Set([
  'neon-lit alley', 'abandoned warehouse', 'rooftop', 'corporate office',
  'underground club', 'cyberspace', 'apartment', 'police station', 'generic urban'
]);

/**
 * Parses raw AI text response into a scene object.
 * Strips markdown code fences if present.
 * @param {string} rawText
 * @returns {Object} parsed JSON or null
 */
export function parseAIResponse(rawText) {
  if (!rawText) return null;

  // Strip markdown code blocks if AI wraps JSON in ```json ... ```
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validates a parsed scene object and fills in safe defaults for missing/invalid fields.
 * @param {Object} scene - Parsed scene from AI
 * @returns {{ valid: boolean, scene: Object, errors: string[] }}
 */
export function validateScene(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object') {
    return {
      valid: false,
      scene: null,
      errors: ['Response is not a valid object']
    };
  }

  // Validate and sanitize each field
  const validated = { ...scene };

  // narrative
  if (!validated.narrative || typeof validated.narrative !== 'string') {
    errors.push('Missing or invalid narrative');
    validated.narrative = 'The scene unfolds before you...';
  }

  // sceneType
  if (!VALID_SCENE_TYPES.has(validated.sceneType)) {
    errors.push(`Invalid sceneType: ${validated.sceneType}`);
    validated.sceneType = 'exploration';
  }

  // mood
  if (!VALID_MOODS.has(validated.mood)) {
    errors.push(`Invalid mood: ${validated.mood}`);
    validated.mood = 'mysterious';
  }

  // location
  if (!validated.location || typeof validated.location !== 'string') {
    validated.location = 'Unknown Location';
  }

  // choices - must be array with 1+ items
  if (!Array.isArray(validated.choices) || validated.choices.length === 0) {
    errors.push('Missing or empty choices array');
    validated.choices = [
      { id: 1, text: 'Continue forward', consequences: ['Move to the next area'] },
      { id: 2, text: 'Look around carefully', consequences: ['Observe surroundings'] },
      { id: 3, text: 'Wait and watch', consequences: ['Gather information passively'] }
    ];
  } else {
    // Normalize choices to ensure they all have id, text, consequences
    validated.choices = validated.choices
      .filter(c => c && typeof c === 'object')
      .slice(0, 5) // max 5 choices
      .map((c, i) => ({
        id: c.id ?? i + 1,
        text: typeof c.text === 'string' ? c.text : `Option ${i + 1}`,
        consequences: Array.isArray(c.consequences) ? c.consequences : []
      }));

    if (validated.choices.length === 0) {
      validated.choices = [{ id: 1, text: 'Continue', consequences: [] }];
    }
  }

  // worldStateUpdates
  if (!validated.worldStateUpdates || typeof validated.worldStateUpdates !== 'object') {
    validated.worldStateUpdates = {
      newFacts: [],
      characterChanges: {},
      inventoryChanges: { add: [], remove: [] },
      reputationChanges: {}
    };
  } else {
    const u = validated.worldStateUpdates;
    if (!Array.isArray(u.newFacts)) u.newFacts = [];
    if (!u.characterChanges || typeof u.characterChanges !== 'object') u.characterChanges = {};
    if (!u.inventoryChanges || typeof u.inventoryChanges !== 'object') {
      u.inventoryChanges = { add: [], remove: [] };
    } else {
      if (!Array.isArray(u.inventoryChanges.add)) u.inventoryChanges.add = [];
      if (!Array.isArray(u.inventoryChanges.remove)) u.inventoryChanges.remove = [];
    }
    if (!u.reputationChanges || typeof u.reputationChanges !== 'object') u.reputationChanges = {};
  }

  // visualScene
  if (!validated.visualScene || typeof validated.visualScene !== 'object') {
    errors.push('Missing visualScene');
    validated.visualScene = {
      environment: 'neon-lit alley',
      lighting: 'flickering neon',
      objects: ['rain', 'shadows']
    };
  } else {
    if (!VALID_ENVIRONMENTS.has(validated.visualScene.environment)) {
      validated.visualScene.environment = 'generic urban';
    }
    if (!validated.visualScene.lighting) {
      validated.visualScene.lighting = 'flickering neon';
    }
    if (!Array.isArray(validated.visualScene.objects)) {
      validated.visualScene.objects = [];
    }
  }

  return {
    valid: errors.length === 0,
    scene: validated,
    errors
  };
}

/**
 * Applies worldStateUpdates from an AI scene to the current game world state.
 * @param {Object} currentWorldState
 * @param {Object} worldStateUpdates from AI response
 * @param {string} location current scene location
 * @returns {Object} new world state
 */
export function applyWorldStateUpdates(currentWorldState, worldStateUpdates, location) {
  const { newFacts, characterChanges, inventoryChanges, reputationChanges } = worldStateUpdates;

  let inventory = [...currentWorldState.inventory];

  // Apply inventory changes
  if (inventoryChanges.add?.length) {
    const toAdd = inventoryChanges.add.filter(
      item => item && typeof item === 'string' && !inventory.includes(item)
    );
    inventory = [...inventory, ...toAdd];
  }
  if (inventoryChanges.remove?.length) {
    inventory = inventory.filter(item => !inventoryChanges.remove.includes(item));
  }

  // Apply reputation changes
  const reputation = { ...currentWorldState.reputation };
  for (const [faction, delta] of Object.entries(reputationChanges || {})) {
    const key = faction.toLowerCase();
    if (typeof reputation[key] === 'number') {
      // Clamp between -100 and 100
      reputation[key] = Math.max(-100, Math.min(100, reputation[key] + Number(delta)));
    }
  }

  // Apply facts (keep last 30 to avoid unbounded growth)
  const activeFacts = [
    ...currentWorldState.activeFacts,
    ...(newFacts || []).filter(f => f && typeof f === 'string')
  ].slice(-30);

  // Apply character/relationship changes
  const relationships = { ...currentWorldState.relationships };
  for (const [name, status] of Object.entries(characterChanges || {})) {
    if (name && typeof status === 'string') {
      relationships[name] = status;
    }
  }

  return {
    ...currentWorldState,
    inventory,
    reputation,
    activeFacts,
    relationships,
    currentLocation: location || currentWorldState.currentLocation,
    completedScenes: currentWorldState.completedScenes + 1
  };
}
