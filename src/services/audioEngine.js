/**
 * Tone.js dynamic music engine.
 * Generates procedural music that adapts to scene mood.
 * Uses synthesizers and patterns - no external audio files needed.
 */

import * as Tone from 'tone';

export class AudioEngine {
  constructor() {
    this.synth = null;
    this.pattern = null;
    this.loop = null;
    this.drone = null;
    this.noise = null;
    this.currentMood = null;
    this.isPlaying = false;
    this.isInitialized = false;
    this.masterVolume = -6; // dB
  }

  /** Must be called after a user interaction (browser audio policy) */
  async init() {
    if (this.isInitialized) return;
    await Tone.start();
    this.isInitialized = true;
    console.log('[AudioEngine] Tone.js audio context started');
  }

  /**
   * Transitions to a new mood. No-op if mood hasn't changed.
   * @param {string} mood - 'tense' | 'calm' | 'mysterious' | 'action' | 'horror'
   */
  changeMood(mood) {
    if (!this.isInitialized) return;
    if (this.currentMood === mood && this.isPlaying) return;

    this.stop();
    this.currentMood = mood;

    try {
      switch (mood) {
        case 'tense':    this.playTenseMusic();     break;
        case 'calm':     this.playCalmMusic();      break;
        case 'action':   this.playActionMusic();    break;
        case 'mysterious': this.playMysteriousMusic(); break;
        case 'horror':   this.playHorrorMusic();    break;
        default:         this.playCalmMusic();      break;
      }
    } catch (err) {
      console.error('[AudioEngine] Failed to start music:', err);
    }
  }

  // ─── MOOD IMPLEMENTATIONS ──────────────────────────────────────────────────

  playTenseMusic() {
    // Pulsing dark bassline with FM synthesis
    const synth = new Tone.FMSynth({
      harmonicity: 3.5,
      modulationIndex: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 2, sustain: 0.3, release: 2 },
      volume: this.masterVolume
    }).toDestination();

    // Add reverb for depth
    const reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();
    synth.connect(reverb);

    const bassNotes = ['C2', 'C2', 'Bb1', 'C2', 'Eb2', 'C2'];
    let i = 0;

    const loop = new Tone.Loop(time => {
      synth.triggerAttackRelease(bassNotes[i % bassNotes.length], '8n', time);
      i++;
    }, '4n');

    loop.start(0);
    Tone.Transport.bpm.value = 80;
    Tone.Transport.start();

    this.synth = synth;
    this.loop = loop;
    this.isPlaying = true;
  }

  playCalmMusic() {
    // Soft ambient pads
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 3, sustain: 0.4, release: 4 },
      volume: this.masterVolume - 6
    }).toDestination();

    const reverb = new Tone.Reverb({ decay: 6, wet: 0.5 }).toDestination();
    synth.connect(reverb);

    const chords = [
      ['C3', 'E3', 'G3'],
      ['A2', 'C3', 'E3'],
      ['F2', 'A2', 'C3'],
      ['G2', 'B2', 'D3']
    ];
    let i = 0;

    const loop = new Tone.Loop(time => {
      synth.triggerAttackRelease(chords[i % chords.length], '2n', time);
      i++;
    }, '2n');

    loop.start(0);
    Tone.Transport.bpm.value = 60;
    Tone.Transport.start();

    this.synth = synth;
    this.loop = loop;
    this.isPlaying = true;
  }

  playActionMusic() {
    // Fast membrane drum pattern
    const kick = new Tone.MembraneSynth({
      volume: this.masterVolume
    }).toDestination();

    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 },
      volume: this.masterVolume - 4
    }).toDestination();

    const dist = new Tone.Distortion(0.4).toDestination();
    synth.connect(dist);

    // Kick pattern
    const kickPattern = new Tone.Sequence(time => {
      kick.triggerAttackRelease('C1', '8n', time);
    }, [1, 0, 0, 0, 1, 0, 1, 0], '8n');

    // Melody riff
    const riff = ['C3', 'Eb3', 'G3', 'Bb3', 'C3', 'Bb3', 'G3', 'Eb3'];
    let ri = 0;
    const melLoop = new Tone.Loop(time => {
      synth.triggerAttackRelease(riff[ri % riff.length], '16n', time);
      ri++;
    }, '16n');

    kickPattern.start(0);
    melLoop.start(0);
    Tone.Transport.bpm.value = 140;
    Tone.Transport.start();

    this.synth = { kick, synth };
    this.pattern = kickPattern;
    this.loop = melLoop;
    this.isPlaying = true;
  }

  playMysteriousMusic() {
    // Eerie dissonant tones with AM synthesis
    const synth = new Tone.AMSynth({
      harmonicity: 2.5,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 1, decay: 2, sustain: 0.3, release: 3 },
      volume: this.masterVolume
    }).toDestination();

    const reverb = new Tone.Reverb({ decay: 8, wet: 0.6 }).toDestination();
    synth.connect(reverb);

    const notes = ['C#3', 'D3', 'F#3', 'G3', 'Bb3', 'F3'];
    let index = 0;

    const loop = new Tone.Loop(time => {
      synth.triggerAttackRelease(notes[index % notes.length], '2n', time);
      index++;
    }, '2n');

    loop.start(0);
    Tone.Transport.bpm.value = 70;
    Tone.Transport.start();

    this.synth = synth;
    this.loop = loop;
    this.isPlaying = true;
  }

  playHorrorMusic() {
    // Low drone + occasional noise bursts
    const drone = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 3, decay: 0, sustain: 1, release: 5 },
      volume: this.masterVolume - 14
    }).toDestination();

    const reverb = new Tone.Reverb({ decay: 12, wet: 0.8 }).toDestination();
    drone.connect(reverb);
    drone.triggerAttack('C1');

    const noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.5, decay: 1.5, sustain: 0 },
      volume: this.masterVolume - 18
    }).toDestination();

    const loop = new Tone.Loop(time => {
      if (Math.random() > 0.6) {
        noise.triggerAttackRelease('8n', time);
      }
    }, '2n');

    loop.start(0);
    Tone.Transport.bpm.value = 40;
    Tone.Transport.start();

    this.drone = drone;
    this.noise = noise;
    this.loop = loop;
    this.isPlaying = true;
  }

  // ─── CONTROLS ──────────────────────────────────────────────────────────────

  stop() {
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();

      // Dispose synths and patterns
      if (this.synth) {
        if (this.synth.kick) this.synth.kick.dispose();
        if (this.synth.synth) this.synth.synth.dispose();
        if (typeof this.synth.dispose === 'function') this.synth.dispose();
        this.synth = null;
      }
      this.pattern?.dispose();  this.pattern = null;
      this.loop?.dispose();     this.loop = null;
      this.drone?.dispose();    this.drone = null;
      this.noise?.dispose();    this.noise = null;

      this.isPlaying = false;
    } catch (err) {
      console.warn('[AudioEngine] Error during stop:', err);
    }
  }

  setVolume(db) {
    this.masterVolume = db;
    Tone.getDestination().volume.value = db;
  }

  getMood() {
    return this.currentMood;
  }
}
