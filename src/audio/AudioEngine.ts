/**
 * AudioEngine - Handles microphone input and FFT audio analysis
 * Uses Web Audio API's AnalyserNode for real-time frequency and waveform data
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  // FFT configuration - 2048 gives good frequency resolution
  private readonly fftSize = 2048;

  // Pre-allocated typed arrays for performance
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private waveformData: Uint8Array<ArrayBuffer> | null = null;

  private _isRunning = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get frequencyBinCount(): number {
    return this.analyser?.frequencyBinCount ?? 0;
  }

  /**
   * Request microphone access and initialize the audio analysis chain
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Create audio context
      this.audioContext = new AudioContext();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8; // Smooth transitions
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Connect microphone to analyser
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);

      // Initialize data arrays
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Uint8Array(this.analyser.fftSize);

      this._isRunning = true;
    } catch (error) {
      console.error('Failed to start audio engine:', error);
      throw error;
    }
  }

  /**
   * Stop the audio engine and release resources
   */
  stop(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this._isRunning = false;
  }

  // Cached empty array to avoid repeated allocations
  private static readonly emptyArray = new Uint8Array(0);

  /**
   * Get current frequency data (spectrum)
   * Returns values 0-255 for each frequency bin
   */
  getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (!this.analyser || !this.frequencyData) {
      return AudioEngine.emptyArray;
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Get current waveform data (time domain)
   * Returns values 0-255, with 128 being silence
   */
  getWaveformData(): Uint8Array<ArrayBuffer> {
    if (!this.analyser || !this.waveformData) {
      return AudioEngine.emptyArray;
    }
    this.analyser.getByteTimeDomainData(this.waveformData);
    return this.waveformData;
  }

  /**
   * Get the average amplitude (useful for beat detection)
   */
  getAverageAmplitude(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length / 255;
  }

  /**
   * Get bass amplitude (low frequencies - useful for beat detection)
   */
  getBassAmplitude(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    // Sample first 10% of frequency bins (bass frequencies)
    const bassRange = Math.floor(data.length * 0.1);
    let sum = 0;
    for (let i = 0; i < bassRange; i++) {
      sum += data[i];
    }
    return sum / bassRange / 255;
  }

  /**
   * Get mid-range amplitude
   */
  getMidAmplitude(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    const start = Math.floor(data.length * 0.1);
    const end = Math.floor(data.length * 0.5);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  /**
   * Get treble amplitude (high frequencies)
   */
  getTrebleAmplitude(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    const start = Math.floor(data.length * 0.5);
    let sum = 0;
    for (let i = start; i < data.length; i++) {
      sum += data[i];
    }
    return sum / (data.length - start) / 255;
  }
}
