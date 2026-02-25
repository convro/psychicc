/**
 * Builds structured prompts for DeepSeek API calls.
 * Encodes full world state + player choice into a single prompt message.
 */

export const SYSTEM_PROMPT = `You are a master storyteller for an interactive narrative game. Your job is to:

1. Generate engaging, coherent story scenes based on player choices
2. Maintain strict consistency with established world state
3. Create meaningful consequences for every player action
4. Respond ONLY in valid JSON format

RULES:
- Never contradict established facts from worldState
- Every choice must have real, lasting consequences
- Characters remember player's past actions
- Tone must match genre (cyberpunk noir, dark, gritty)
- NO deus ex machina or sudden power-ups
- Keep scenes 150-250 words

RESPONSE FORMAT (strict JSON, no markdown, no code blocks):
{
  "narrative": "The scene description...",
  "sceneType": "combat" | "dialogue" | "exploration" | "decision",
  "mood": "tense" | "calm" | "mysterious" | "action" | "horror",
  "location": "brief location name",
  "choices": [
    {
      "id": 1,
      "text": "Choice text",
      "consequences": ["what this leads to"]
    }
  ],
  "worldStateUpdates": {
    "newFacts": ["facts to add"],
    "characterChanges": {"npcName": "how they changed"},
    "inventoryChanges": {"add": [], "remove": []},
    "reputationChanges": {"faction": 10}
  },
  "visualScene": {
    "environment": "neon-lit alley" | "abandoned warehouse" | "rooftop" | "corporate office" | "underground club" | "cyberspace" | "apartment" | "police station",
    "lighting": "dim red" | "harsh white" | "flickering neon" | "purple haze" | "cold blue" | "golden warm",
    "objects": ["list of objects in scene"]
  }
}`;

export const INITIAL_SCENE_PROMPT = `Generate the opening scene of the game.

Setting: Neo-Tokyo, 2077. The player character is Ghost, a freelance netrunner (hacker).

Opening scenario: Ghost receives an encrypted message with a mysterious job offer while in their cramped apartment. The city outside is raining neon. Something feels different about this message.

Create an atmospheric, noir cyberpunk opening with exactly 3 choices that lead to clearly different story branches:
1. Accept the job immediately (risky, high reward path)
2. Investigate who sent the message first (cautious, info-gathering path)
3. Ignore/delete the message (unexpected path with consequences)

Make the narrative hook intriguing. This is the player's first impression - make it count.

World state:
- Genre: cyberpunk noir
- Player: Ghost, freelance netrunner
- Location: Neo-Tokyo District 7, 2077
- Inventory: commlink, credstick
- Reputation: Megacorps 0, Street 50, Police -20`;

/**
 * Builds the user message for a scene continuation.
 * @param {Object} worldState - Current game world state
 * @param {Object} choice - The choice the player made {id, text, consequences}
 * @returns {string}
 */
export function buildContinuationPrompt(worldState, choice) {
  const recentHistory = worldState.activeFacts.slice(-10).join('\n- ');
  const relationships = Object.entries(worldState.relationships || {})
    .map(([name, status]) => `${name}: ${status}`)
    .join(', ') || 'None established';

  return `Continue the story based on this player choice.

PLAYER CHOSE: "${choice.text}"
Expected consequences: ${choice.consequences?.join(', ') || 'Unknown'}

CURRENT WORLD STATE:
- Scene #${worldState.completedScenes + 1}
- Location: ${worldState.currentLocation || 'Unknown'}
- Inventory: ${worldState.inventory.join(', ')}
- Reputation: Megacorps ${worldState.reputation.megacorps}, Street ${worldState.reputation.street}, Police ${worldState.reputation.police}
- Relationships: ${relationships}

ESTABLISHED FACTS (must not contradict):
- ${recentHistory}

Generate the next scene. Remember:
- This choice MUST have consequences visible in the narrative
- NPCs remember previous interactions
- Maintain the cyberpunk noir tone
- Provide 3-5 meaningful choices for the next turn`;
}

/**
 * Builds a prompt for a specific story event override (e.g., random encounters).
 * @param {Object} worldState
 * @param {string} eventType
 * @returns {string}
 */
export function buildEventPrompt(worldState, eventType) {
  return `Generate a sudden ${eventType} event scene that interrupts the current situation.

World state: ${JSON.stringify(worldState, null, 2)}

This should feel organic, not forced. Connect it to established facts where possible.`;
}
