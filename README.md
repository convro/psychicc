# Infinite Paths 🌐

An AI-driven interactive story game set in a cyberpunk Neo-Tokyo. Every choice you make shapes the narrative, and no two playthroughs are the same.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| 3D Scenes | Three.js |
| Audio | Tone.js (procedural synthesis) |
| AI Narrative | DeepSeek Reasoner API |
| State | Zustand |
| Styling | Tailwind CSS |
| Save System | IndexedDB (via `idb`) |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your DeepSeek API key:

```
VITE_DEEPSEEK_API_KEY=your_key_here
```

Get a key at: https://platform.deepseek.com

### 3. Run the development server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## How to Play

1. Click **"Enter the Matrix"** on the splash screen (this also enables audio)
2. Read the AI-generated scene narrative
3. Watch the 3D scene render the environment
4. Listen to the adaptive music (changes per scene mood)
5. Choose from 3-5 options to advance the story
6. Your choices have lasting consequences — NPCs remember everything

## Controls

| Button | Action |
|--------|--------|
| ♪ ON/OFF | Toggle adaptive music |
| ↩ Back | Undo last choice |
| ◈ Save | Open save/load menu |
| ◉ Debug | Show world state panel |
| ↺ New | Start a new game |

## Project Structure

```
src/
├── components/
│   ├── Scene3D.jsx          # Three.js canvas wrapper
│   ├── StoryText.jsx        # Typewriter narrative display
│   ├── ChoiceButtons.jsx    # Player choice UI
│   ├── WorldState.jsx       # Debug panel
│   └── SaveLoadMenu.jsx     # Save/load modal
├── services/
│   ├── deepseekAPI.js       # DeepSeek Reasoner integration
│   ├── audioEngine.js       # Tone.js procedural music
│   └── saveSystem.js        # IndexedDB persistence
├── store/
│   └── gameStore.js         # Zustand global state
├── scenes/
│   └── sceneGenerator.js    # Three.js scene templates
└── utils/
    ├── promptBuilder.js     # AI prompt construction
    └── stateValidator.js    # Response validation + world state updates
```

## Scene Types

The Three.js renderer supports 8 distinct environments:

- **Neon-lit alley** — Rain, neon signs, fog
- **Abandoned warehouse** — Industrial lighting, crates
- **Rooftop** — City skyline, stars, HVAC units
- **Corporate office** — Polished floors, holographic displays
- **Underground club** — Rotating colored lights, bar
- **Cyberspace** — Grid, floating data cubes, wireframe geometry
- **Apartment** — Cramped room, screen glow, city view
- **Police station** — Harsh lighting, interrogation setup

## Music Moods

| Mood | Style |
|------|-------|
| tense | Dark FM bassline, 80 BPM |
| calm | Ambient pads, slow chords |
| action | Drum pattern + sawtooth riff, 140 BPM |
| mysterious | AM synthesis, dissonant notes |
| horror | Low drone + noise bursts |

## Sample DeepSeek Test Prompt

Use this to test your API key directly:

```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $VITE_DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-reasoner",
    "messages": [
      {"role": "user", "content": "Generate a short cyberpunk scene in Neo-Tokyo 2077. Respond in JSON with fields: narrative, mood, location, choices (3 items)."}
    ],
    "max_tokens": 500
  }'
```

## Without an API Key

The game will show an error when trying to generate scenes. To test the UI without an API key, you can modify `src/services/deepseekAPI.js` to return a mock scene:

```javascript
// Temporary mock for testing
export async function generateInitialScene() {
  return {
    narrative: "Rain hammers your apartment window. An encrypted message blinks on your terminal...",
    sceneType: "decision",
    mood: "mysterious",
    location: "Apartment - Neo-Tokyo District 7",
    choices: [
      { id: 1, text: "Accept the job", consequences: ["High risk, high reward"] },
      { id: 2, text: "Investigate the sender", consequences: ["Gather information first"] },
      { id: 3, text: "Delete the message", consequences: ["Avoid the situation"] }
    ],
    worldStateUpdates: { newFacts: [], characterChanges: {}, inventoryChanges: { add: [], remove: [] }, reputationChanges: {} },
    visualScene: { environment: "apartment", lighting: "cold blue", objects: ["rain"] }
  };
}
```

## Build for Production

```bash
npm run build
npm run preview
```
