/**
 * Builds structured prompts for DeepSeek API calls.
 * Supports Polish/English output and customizable content intensity via sliders.
 */

/**
 * Builds a dynamic system prompt based on game settings.
 * @param {Object} settings - { language, brutality, action, profanity, darkness, customTheme }
 * @returns {string}
 */
export function buildSystemPrompt(settings = {}) {
  const {
    language = 'pl',
    brutality = 50,
    action = 50,
    profanity = 30,
    darkness = 50,
    customTheme = ''
  } = settings;

  const isPL = language === 'pl';

  // ── Intensity descriptors ───────────────────────────────────────────────────

  let brutalityInstr;
  if (brutality >= 85) {
    brutalityInstr = isPL
      ? 'Bądź EKSTREMALNIE brutalny i graficzny. Opisuj przemoc, ból, krew i śmierć w najdrobniejszych szczegółach. Bez cenzury, bez eufemizmów. Nie omijaj niczego.'
      : 'Be EXTREMELY brutal and graphic. Describe violence, pain, blood and death in explicit detail. No censorship, no euphemisms. Do not skip anything.';
  } else if (brutality >= 60) {
    brutalityInstr = isPL
      ? 'Bądź wyraźnie brutalny — nie omijaj przemocy i jej widocznych konsekwencji.'
      : 'Be clearly brutal — do not shy away from violence and its visible consequences.';
  } else if (brutality >= 35) {
    brutalityInstr = isPL
      ? 'Umiarkowana brutalność — przemoc obecna, ale nie dominuje.'
      : 'Moderate brutality — violence present but not dominant.';
  } else {
    brutalityInstr = isPL
      ? 'Minimalna brutalność — przemoc jedynie sugerowana lub poza kadrem.'
      : 'Minimal brutality — violence only implied or off-screen.';
  }

  let actionInstr;
  if (action >= 85) {
    actionInstr = isPL
      ? 'MAKSIMUM akcji i niespodzianek! Każda scena musi zawierać nagłe zwroty, nieoczekiwane zdarzenia, pościgi lub starcia. Ciągłe napięcie i zawrotne tempo — nic nie jest bezpieczne.'
      : 'MAXIMUM action and surprises! Every scene must have sudden twists, unexpected events, chases or clashes. Constant tension and breakneck pace — nothing is safe.';
  } else if (action >= 60) {
    actionInstr = isPL
      ? 'Dużo akcji i dynamicznych zdarzeń — sceny szybkie, coś ciągle się dzieje.'
      : 'Lots of action and dynamic events — fast scenes, things are constantly happening.';
  } else if (action >= 35) {
    actionInstr = isPL
      ? 'Zrównoważony mix akcji i spokojniejszych momentów.'
      : 'Balanced mix of action and calmer moments.';
  } else {
    actionInstr = isPL
      ? 'Spokojne tempo — więcej dialogu, eksploracji i przemyśleń niż akcji.'
      : 'Calm pace — more dialogue, exploration and reflection than action.';
  }

  let profanityInstr;
  if (profanity >= 85) {
    profanityInstr = isPL
      ? 'Używaj BARDZO mocnych i częstych przekleństw. Postacie mówią dosadnie, brutalnie i bez ogródek. Wulgarny język jest normą w tej narracji.'
      : 'Use VERY strong and frequent profanity. Characters speak crudely, brutally and bluntly. Vulgar language is the norm in this narrative.';
  } else if (profanity >= 60) {
    profanityInstr = isPL
      ? 'Używaj przekleństw regularnie — to realistyczny, uliczny język.'
      : 'Use profanity regularly — this is realistic street language.';
  } else if (profanity >= 35) {
    profanityInstr = isPL
      ? 'Kilka przekleństw dla klimatu, ale nie przesadzaj.'
      : 'A few swear words for atmosphere, but do not overdo it.';
  } else {
    profanityInstr = isPL
      ? 'Minimalne lub zerowe przekleństwa — ogólnie czysty język.'
      : 'Minimal or no profanity — generally clean language.';
  }

  let darknessInstr;
  if (darkness >= 85) {
    darknessInstr = isPL
      ? 'Narracja MAKSYMALNIE mroczna i nihilistyczna. Nie ma nadziei. Każde zwycięstwo jest pyrrusowe. Wszyscy mają ukryte złe intencje. Beznadziejny, przytłaczający, traumatyczny klimat bez wyjścia.'
      : 'MAXIMALLY dark and nihilistic narrative. There is no hope. Every victory is pyrrhic. Everyone has hidden bad intentions. Hopeless, oppressive, traumatic atmosphere with no way out.';
  } else if (darkness >= 60) {
    darknessInstr = isPL
      ? 'Wyraźnie mroczna atmosfera — dobro się nie opłaca, świat jest zepsuty, pozytywne chwile są kruche.'
      : 'Clearly dark atmosphere — goodness does not pay, the world is corrupt, positive moments are fragile.';
  } else if (darkness >= 35) {
    darknessInstr = isPL
      ? 'Cyberpunkowy mrok — ciemność jest wszędzie, ale są też promyki nadziei.'
      : 'Cyberpunk darkness — darkness is everywhere, but there are also glimpses of hope.';
  } else {
    darknessInstr = isPL
      ? 'Mroczne tło, ale z realnymi możliwościami sukcesu i pozytywnych chwil.'
      : 'Dark background but with real possibilities for success and positive moments.';
  }

  const langInstr = isPL
    ? 'KLUCZOWE: Pisz CAŁĄ narrację i WSZYSTKIE teksty wyborów PO POLSKU. Tylko wartości techniczne (sceneType, mood, environment, lighting, particles, cameraStyle) pozostają po angielsku — używaj dokładnie podanych opcji enum.'
    : 'Write all narrative and all choice text in ENGLISH.';

  const themeInstr = customTheme
    ? (isPL
        ? `\nTEMAT I SETTING GRY (to jest priorytet!): "${customTheme}"
Całą historię prowadź w tym settingu. Dostosuj postacie, lokacje i fabułę do wybranego tematu gracza. Nie używaj domyślnego cyberpunkowego settingu jeśli gracz wybrał inny temat.\n`
        : `\nGAME THEME AND SETTING (this is priority!): "${customTheme}"
Conduct the entire story in this setting. Adapt characters, locations and plot to the player's chosen theme. Do not default to cyberpunk if the player chose a different theme.\n`)
    : '';

  return `You are a master storyteller for an interactive narrative game. Your role:
1. Generate engaging, coherent story scenes based on player choices
2. Maintain strict consistency with established world state
3. Create meaningful, lasting consequences for every player action
4. Respond ONLY in valid JSON format — no markdown, no code blocks
${themeInstr}
CONTENT INTENSITY SETTINGS (obey these at ALL times):
- BRUTALITY: ${brutalityInstr}
- ACTION DENSITY: ${actionInstr}
- LANGUAGE/PROFANITY: ${profanityInstr}
- DARKNESS/TONE: ${darknessInstr}

${langInstr}

RULES:
- Never contradict established facts from worldState
- Every choice MUST have real, lasting consequences visible in the next scene
- Characters remember all previous player interactions
- Keep scenes 150-250 words
- Provide 3-4 distinct, meaningful choices

RESPONSE FORMAT (strict JSON, no markdown, no code blocks):
{
  "narrative": "Scene description here...",
  "sceneType": "combat" | "dialogue" | "exploration" | "decision",
  "mood": "tense" | "calm" | "mysterious" | "action" | "horror",
  "location": "brief location name",
  "choices": [
    { "id": 1, "text": "Choice text", "consequences": ["what this leads to"] }
  ],
  "worldStateUpdates": {
    "newFacts": ["fact to remember"],
    "characterChanges": { "npcName": "how they changed" },
    "inventoryChanges": { "add": [], "remove": [] },
    "reputationChanges": { "faction": 10 }
  },
  "visualScene": {
    "environment": "neon-lit alley" | "abandoned warehouse" | "rooftop" | "corporate office" | "underground club" | "cyberspace" | "apartment" | "police station" | "sewer" | "market" | "hospital" | "generic urban",
    "lighting": "dim red" | "harsh white" | "flickering neon" | "purple haze" | "cold blue" | "golden warm" | "blood red" | "emergency orange",
    "objects": ["list of notable objects"],
    "particles": "rain" | "smoke" | "sparks" | "embers" | "digital" | "none",
    "cameraStyle": "static" | "slow-pan" | "orbit" | "shake"
  }
}`;
}

/**
 * Builds the initial scene prompt.
 * @param {Object} settings - Game settings
 * @returns {string}
 */
export function buildInitialScenePrompt(settings = {}) {
  const { customTheme = '', language = 'pl' } = settings;
  const isPL = language === 'pl';

  if (customTheme) {
    return isPL
      ? `Wygeneruj scenę otwierającą grę.

Temat/Setting wybrany przez gracza: "${customTheme}"

Stwórz angażującą scenę otwierającą PASUJĄCĄ DO TEGO TEMATU z dokładnie 3 wyborami prowadzącymi do wyraźnie różnych gałęzi fabularnych:
1. Wybór aktywny/agresywny (ryzykowna ścieżka wysokich nagród)
2. Wybór ostrożny/analityczny (ścieżka zbierania informacji)
3. Wybór nieoczekiwany (zaskakująca ścieżka z konsekwencjami)

Narrację napisz PO POLSKU. Dostosuj postacie, klimat i lokacje do tematu gracza.
Uczyń hak fabularny intrygującym — to pierwsze wrażenie gracza, spraw żeby wciągał.`
      : `Generate the opening scene of the game.

Player-chosen theme/setting: "${customTheme}"

Create an engaging opening scene MATCHING THIS THEME with exactly 3 choices leading to clearly different story branches:
1. Active/aggressive choice (risky, high reward path)
2. Cautious/analytical choice (info-gathering path)
3. Unexpected choice (surprising path with consequences)

Adapt characters, atmosphere and locations to the player's theme.
Make the narrative hook intriguing — this is the player's first impression, make it count.`;
  }

  // Default cyberpunk opening
  return isPL
    ? `Wygeneruj scenę otwierającą grę.

Setting: Neo-Tokyo, 2077. Gracz to Ghost — freelancerski netrunner (haker).

Scenariusz: Ghost siedzi w swoim ciasnym mieszkaniu w Dzielnicy 7. Na zewnątrz pada deszcz, neony pulsują przez zaparowane szyby. Nagle na commlinku pojawia się zaszyfrowana wiadomość z tajemniczą ofertą pracy. Coś w tej wiadomości jest inne niż zwykle.

Stwórz atmosferyczną, noir-cyberpunkową scenę otwierającą z dokładnie 3 wyborami:
1. Przyjmij zlecenie natychmiast (ryzykowna ścieżka wysokich nagród)
2. Zbadaj najpierw kto wysłał wiadomość (ostrożna ścieżka informacyjna)
3. Zignoruj/usuń wiadomość (nieoczekiwana ścieżka z konsekwencjami)

Pisz po POLSKU. Narracja powinna być atmosferyczna, mroczna i wciągająca.

Stan świata:
- Gatunek: cyberpunk noir
- Gracz: Ghost, freelancerski netrunner
- Lokacja: Neo-Tokyo Dystrykt 7, 2077
- Ekwipunek: commlink, credstick
- Reputacja: Megakorporacje 0, Ulica 50, Policja -20`
    : `Generate the opening scene of the game.

Setting: Neo-Tokyo, 2077. The player character is Ghost, a freelance netrunner (hacker).

Opening scenario: Ghost sits in their cramped apartment in District 7. Rain hammers the windows, neon signs pulse through steamed glass. Suddenly an encrypted message appears on the commlink — a mysterious job offer. Something about this message feels different.

Create an atmospheric noir cyberpunk opening with exactly 3 choices:
1. Accept the job immediately (risky, high reward path)
2. Investigate who sent the message first (cautious, info-gathering path)
3. Ignore/delete the message (unexpected path with consequences)

World state:
- Genre: cyberpunk noir
- Player: Ghost, freelance netrunner
- Location: Neo-Tokyo District 7, 2077
- Inventory: commlink, credstick
- Reputation: Megacorps 0, Street 50, Police -20`;
}

/**
 * Builds the continuation prompt for the next scene.
 * @param {Object} worldState
 * @param {Object} choice - { id, text, consequences }
 * @param {Object} settings
 * @returns {string}
 */
export function buildContinuationPrompt(worldState, choice, settings = {}) {
  const { language = 'pl' } = settings;
  const isPL = language === 'pl';

  const recentFacts = worldState.activeFacts.slice(-10).join('\n- ');
  const relationships = Object.entries(worldState.relationships || {})
    .map(([name, status]) => `${name}: ${status}`)
    .join(', ') || (isPL ? 'Żadnych' : 'None');

  if (isPL) {
    return `Kontynuuj historię na podstawie wyboru gracza.

GRACZ WYBRAŁ: "${choice.text}"
Oczekiwane konsekwencje: ${choice.consequences?.join(', ') || 'Nieznane'}

AKTUALNY STAN ŚWIATA:
- Scena #${worldState.completedScenes + 1}
- Lokacja: ${worldState.currentLocation || 'Nieznana'}
- Ekwipunek: ${worldState.inventory.join(', ')}
- Reputacja: Megakorporacje ${worldState.reputation.megacorps}, Ulica ${worldState.reputation.street}, Policja ${worldState.reputation.police}
- Relacje: ${relationships}

USTALONE FAKTY (nie możesz im zaprzeczać):
- ${recentFacts}

Wygeneruj następną scenę PO POLSKU. Pamiętaj:
- Wybór gracza MUSI mieć widoczne konsekwencje w narracji
- NPCe pamiętają poprzednie interakcje
- Zachowaj klimat i ustawienia intensywności z systemowego promptu
- Podaj 3-4 sensowne wybory na następną turę`;
  }

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
- ${recentFacts}

Generate the next scene. Remember:
- This choice MUST have visible consequences in the narrative
- NPCs remember previous interactions
- Maintain tone and intensity settings from system prompt
- Provide 3-4 meaningful choices for the next turn`;
}

/**
 * Builds a prompt for random encounter events.
 * @param {Object} worldState
 * @param {string} eventType
 * @returns {string}
 */
export function buildEventPrompt(worldState, eventType) {
  return `Generate a sudden ${eventType} event scene that interrupts the current situation.

World state: ${JSON.stringify(worldState, null, 2)}

This should feel organic, not forced. Connect it to established facts where possible.`;
}
