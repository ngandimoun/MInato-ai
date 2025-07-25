// ============================================================================
// FILE: lib/core/ambient-soundscape.ts
// DESC: Dynamic ambient soundscape for therapy sessions
// ============================================================================

export interface SoundscapeConfig {
  type: 'rain' | 'ocean' | 'forest' | 'white-noise' | 'breathing' | 'silence';
  volume: number; // 0-1
  intensity: 'light' | 'medium' | 'heavy';
  adaptToActivity: boolean;
}

export interface ActivityContext {
  isRecording: boolean;
  isTyping: boolean;
  exerciseType?: 'breathing' | 'grounding' | 'meditation';
  emotionalState?: 'calm' | 'anxious' | 'focused' | 'reflective';
  therapeuticTechnique?: string;
}

export class AmbientSoundscape {
  private audioContext: AudioContext | null = null;
  private currentSounds: Map<string, { source: AudioBufferSourceNode; gainNode: GainNode }> = new Map();
  private masterGainNode: GainNode | null = null;
  private config: SoundscapeConfig;
  private isInitialized = false;
  private fadeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(initialConfig: SoundscapeConfig) {
    this.config = initialConfig;
  }

  /**
   * Initialize the audio context and master gain
   */
  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.value = this.config.volume;

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize ambient soundscape:', error);
      return false;
    }
  }

  /**
   * Start the ambient soundscape
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    if (this.config.type === 'silence') return;

    try {
      await this.playSound(this.config.type, this.config.intensity);
    } catch (error) {
      console.error('Failed to start soundscape:', error);
    }
  }

  /**
   * Stop all ambient sounds
   */
  stop(): void {
    this.currentSounds.forEach((sound, key) => {
      this.fadeOut(key, 1000);
    });

    this.fadeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.fadeTimeouts.clear();
  }

  /**
   * Update configuration and adapt soundscape
   */
  updateConfig(newConfig: Partial<SoundscapeConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // If type changed, transition to new sound
    if (oldConfig.type !== this.config.type) {
      this.transitionToSound(this.config.type, this.config.intensity);
    }

    // Update volume
    if (this.masterGainNode && oldConfig.volume !== this.config.volume) {
      this.fadeVolume(this.config.volume, 500);
    }
  }

  /**
   * Adapt soundscape based on current activity
   */
  adaptToActivity(context: ActivityContext): void {
    if (!this.config.adaptToActivity) return;

    // Reduce volume during recording
    if (context.isRecording) {
      this.fadeVolume(this.config.volume * 0.2, 300);
      return;
    }

    // Adjust for exercises
    if (context.exerciseType) {
      switch (context.exerciseType) {
        case 'breathing':
          this.transitionToSound('breathing', 'light');
          break;
        case 'grounding':
          this.transitionToSound('forest', 'medium');
          break;
        case 'meditation':
          this.transitionToSound('ocean', 'light');
          break;
      }
      return;
    }

    // Adjust for emotional state
    if (context.emotionalState) {
      switch (context.emotionalState) {
        case 'anxious':
          this.updateConfig({ type: 'ocean', intensity: 'light', volume: this.config.volume * 0.7 });
          break;
        case 'focused':
          this.updateConfig({ type: 'white-noise', intensity: 'light' });
          break;
        case 'reflective':
          this.updateConfig({ type: 'rain', intensity: 'medium' });
          break;
        default:
          // Return to normal
          this.fadeVolume(this.config.volume, 500);
      }
    } else {
      // Return to normal volume
      this.fadeVolume(this.config.volume, 500);
    }
  }

  /**
   * Get available soundscape types
   */
  static getAvailableTypes(): Array<{ type: SoundscapeConfig['type']; name: string; description: string }> {
    return [
      { type: 'silence', name: 'Silence', description: 'No background sounds' },
      { type: 'rain', name: 'Gentle Rain', description: 'Soft rainfall sounds for relaxation' },
      { type: 'ocean', name: 'Ocean Waves', description: 'Calming ocean waves' },
      { type: 'forest', name: 'Forest Sounds', description: 'Birds and nature sounds' },
      { type: 'white-noise', name: 'White Noise', description: 'Consistent background noise for focus' },
      { type: 'breathing', name: 'Breathing Guide', description: 'Guided breathing rhythm' }
    ];
  }

  /**
   * Private methods
   */
  private async playSound(type: SoundscapeConfig['type'], intensity: 'light' | 'medium' | 'heavy'): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) return;

    // Generate procedural sound based on type
    const soundBuffer = await this.generateSound(type, intensity);
    if (!soundBuffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = soundBuffer;
    source.loop = true;
    source.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    // Set initial volume based on intensity
    const intensityVolume = intensity === 'light' ? 0.3 : intensity === 'medium' ? 0.6 : 0.9;
    gainNode.gain.value = intensityVolume;

    // Start with fade in
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(intensityVolume, this.audioContext.currentTime + 2);

    source.start();

    this.currentSounds.set(type, { source, gainNode });
  }

  private async generateSound(type: SoundscapeConfig['type'], intensity: 'light' | 'medium' | 'heavy'): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 10; // 10 seconds, will loop
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    switch (type) {
      case 'rain':
        this.generateRainSound(leftChannel, rightChannel, sampleRate, intensity);
        break;
      case 'ocean':
        this.generateOceanSound(leftChannel, rightChannel, sampleRate, intensity);
        break;
      case 'forest':
        this.generateForestSound(leftChannel, rightChannel, sampleRate, intensity);
        break;
      case 'white-noise':
        this.generateWhiteNoise(leftChannel, rightChannel, intensity);
        break;
      case 'breathing':
        this.generateBreathingGuide(leftChannel, rightChannel, sampleRate, intensity);
        break;
      default:
        return null;
    }

    return buffer;
  }

  private generateRainSound(left: Float32Array, right: Float32Array, sampleRate: number, intensity: 'light' | 'medium' | 'heavy'): void {
    const dropDensity = intensity === 'light' ? 0.1 : intensity === 'medium' ? 0.3 : 0.6;
    
    for (let i = 0; i < left.length; i++) {
      // Generate random rain drops
      if (Math.random() < dropDensity / sampleRate) {
        const dropIntensity = Math.random() * (intensity === 'light' ? 0.2 : intensity === 'medium' ? 0.4 : 0.6);
        const dropLength = Math.floor(Math.random() * 100) + 50;
        
        for (let j = 0; j < dropLength && i + j < left.length; j++) {
          const decay = Math.exp(-j / 20);
          const sample = (Math.random() - 0.5) * dropIntensity * decay;
          left[i + j] += sample;
          right[i + j] += sample * (0.8 + Math.random() * 0.4); // Slight stereo variation
        }
      }
    }
  }

  private generateOceanSound(left: Float32Array, right: Float32Array, sampleRate: number, intensity: 'light' | 'medium' | 'heavy'): void {
    const waveFreq = 0.1; // Low frequency for ocean waves
    const amplitude = intensity === 'light' ? 0.1 : intensity === 'medium' ? 0.2 : 0.3;
    
    for (let i = 0; i < left.length; i++) {
      const t = i / sampleRate;
      
      // Main wave with multiple harmonics
      let sample = Math.sin(2 * Math.PI * waveFreq * t) * amplitude;
      sample += Math.sin(2 * Math.PI * waveFreq * 2 * t) * amplitude * 0.5;
      sample += Math.sin(2 * Math.PI * waveFreq * 0.5 * t) * amplitude * 0.3;
      
      // Add some noise for foam
      sample += (Math.random() - 0.5) * amplitude * 0.1;
      
      left[i] = sample;
      right[i] = sample * (0.9 + Math.random() * 0.2); // Slight stereo variation
    }
  }

  private generateForestSound(left: Float32Array, right: Float32Array, sampleRate: number, intensity: 'light' | 'medium' | 'heavy'): void {
    const birdDensity = intensity === 'light' ? 0.01 : intensity === 'medium' ? 0.03 : 0.05;
    
    for (let i = 0; i < left.length; i++) {
      let sample = 0;
      
      // Generate bird chirps
      if (Math.random() < birdDensity / sampleRate) {
        const chirpFreq = 800 + Math.random() * 1200; // Bird frequency range
        const chirpLength = Math.floor(Math.random() * 0.2 * sampleRate) + 0.1 * sampleRate;
        
        for (let j = 0; j < chirpLength && i + j < left.length; j++) {
          const t = j / sampleRate;
          const envelope = Math.sin(Math.PI * j / chirpLength); // Bell curve envelope
          const chirp = Math.sin(2 * Math.PI * chirpFreq * t) * envelope * 0.1;
          left[i + j] += chirp;
          right[i + j] += chirp * (Math.random() * 0.5 + 0.5); // Random panning
        }
      }
      
      // Add gentle wind rustling
      sample += (Math.random() - 0.5) * 0.02;
      
      left[i] += sample;
      right[i] += sample;
    }
  }

  private generateWhiteNoise(left: Float32Array, right: Float32Array, intensity: 'light' | 'medium' | 'heavy'): void {
    const amplitude = intensity === 'light' ? 0.05 : intensity === 'medium' ? 0.1 : 0.15;
    
    for (let i = 0; i < left.length; i++) {
      left[i] = (Math.random() - 0.5) * amplitude;
      right[i] = (Math.random() - 0.5) * amplitude;
    }
  }

  private generateBreathingGuide(left: Float32Array, right: Float32Array, sampleRate: number, intensity: 'light' | 'medium' | 'heavy'): void {
    const breathingRate = 0.1; // 6 breaths per minute (4-7-8 pattern)
    const amplitude = intensity === 'light' ? 0.1 : intensity === 'medium' ? 0.15 : 0.2;
    
    for (let i = 0; i < left.length; i++) {
      const t = i / sampleRate;
      
      // Create breathing rhythm (inhale-hold-exhale pattern)
      const cycle = (t * breathingRate) % 1;
      let breathingGuide = 0;
      
      if (cycle < 0.2) { // Inhale (4 seconds)
        breathingGuide = Math.sin(cycle * 5 * Math.PI) * amplitude;
      } else if (cycle < 0.55) { // Hold (7 seconds)
        breathingGuide = amplitude * 0.3;
      } else { // Exhale (8 seconds)
        breathingGuide = Math.sin((cycle - 0.55) * 2.2 * Math.PI + Math.PI) * amplitude;
      }
      
      // Add subtle harmonics
      breathingGuide += Math.sin(2 * Math.PI * 220 * t) * breathingGuide * 0.1; // A3 tone
      
      left[i] = breathingGuide;
      right[i] = breathingGuide;
    }
  }

  private transitionToSound(newType: SoundscapeConfig['type'], intensity: 'light' | 'medium' | 'heavy'): void {
    // Fade out current sounds
    this.currentSounds.forEach((_, key) => {
      this.fadeOut(key, 1000);
    });

    // Start new sound after fade
    setTimeout(() => {
      if (newType !== 'silence') {
        this.playSound(newType, intensity);
      }
    }, 1000);
  }

  private fadeOut(soundKey: string, duration: number): void {
    const sound = this.currentSounds.get(soundKey);
    if (!sound || !this.audioContext) return;

    const { source, gainNode } = sound;
    
    gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);

    const timeout = setTimeout(() => {
      try {
        source.stop();
        source.disconnect();
        gainNode.disconnect();
      } catch (error) {
        // Ignore errors when stopping already stopped sources
      }
      this.currentSounds.delete(soundKey);
      this.fadeTimeouts.delete(soundKey);
    }, duration);

    this.fadeTimeouts.set(soundKey, timeout);
  }

  private fadeVolume(targetVolume: number, duration: number): void {
    if (!this.masterGainNode || !this.audioContext) return;

    this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, this.audioContext.currentTime);
    this.masterGainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + duration / 1000);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.masterGainNode = null;
    this.currentSounds.clear();
    this.fadeTimeouts.clear();
  }
}

export default AmbientSoundscape; 