import { FxSettings } from '../types/music';

export class GuitarFxNode {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;

  // Drive nodes
  private driveGain: GainNode;
  private driveShaper: WaveShaperNode;
  private driveDry: GainNode;
  private driveWet: GainNode;

  // Delay nodes
  private delayNode: DelayNode;
  private delayFeedbackGain: GainNode;
  private delayFilter: BiquadFilterNode;
  private delayDry: GainNode;
  private delayWet: GainNode;

  // Reverb nodes (Schroeder / Convolution style algorithmic reverb network)
  private reverbDry: GainNode;
  private reverbWet: GainNode;
  private reverbInput: GainNode;
  private reverbConvolver: ConvolverNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // --- DRIVE ---
    this.driveGain = ctx.createGain();
    this.driveShaper = ctx.createWaveShaper();
    this.driveShaper.oversample = '4x';
    this.driveDry = ctx.createGain();
    this.driveWet = ctx.createGain();

    // Input -> Drive split
    this.input.connect(this.driveDry);
    this.input.connect(this.driveGain);
    this.driveGain.connect(this.driveShaper);
    this.driveShaper.connect(this.driveWet);

    const postDrive = ctx.createGain();
    this.driveDry.connect(postDrive);
    this.driveWet.connect(postDrive);

    // --- DELAY ---
    this.delayNode = ctx.createDelay(2.0);
    this.delayFeedbackGain = ctx.createGain();
    this.delayFilter = ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 2500;
    this.delayDry = ctx.createGain();
    this.delayWet = ctx.createGain();

    postDrive.connect(this.delayDry);
    postDrive.connect(this.delayNode);

    // Delay loop
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);

    const postDelay = ctx.createGain();
    this.delayDry.connect(postDelay);
    this.delayWet.connect(postDelay);

    // --- REVERB ---
    this.reverbDry = ctx.createGain();
    this.reverbWet = ctx.createGain();
    this.reverbInput = ctx.createGain();
    this.reverbConvolver = ctx.createConvolver();
    this.generateReverbImpulse(1.8, 2.0);

    postDelay.connect(this.reverbDry);
    postDelay.connect(this.reverbInput);
    this.reverbInput.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWet);

    this.reverbDry.connect(this.output);
    this.reverbWet.connect(this.output);

    // Set initial curve
    this.updateCurve(30);
  }

  public updateSettings(fx: FxSettings): void {
    const t = this.ctx.currentTime;

    // Drive
    if (fx.driveEnabled) {
      this.driveDry.gain.setTargetAtTime(0.2, t, 0.02);
      this.driveWet.gain.setTargetAtTime(0.8, t, 0.02);
      const amount = Math.max(1, fx.driveAmount);
      this.driveGain.gain.setTargetAtTime(1 + amount * 0.08, t, 0.02);
      this.updateCurve(amount);
    } else {
      this.driveDry.gain.setTargetAtTime(1.0, t, 0.02);
      this.driveWet.gain.setTargetAtTime(0.0, t, 0.02);
      this.driveGain.gain.setTargetAtTime(1.0, t, 0.02);
    }

    // Delay
    if (fx.delayEnabled) {
      const mix = Math.max(0, Math.min(1, fx.delayMix));
      this.delayDry.gain.setTargetAtTime(1.0 - mix * 0.5, t, 0.02);
      this.delayWet.gain.setTargetAtTime(mix, t, 0.02);
      this.delayNode.delayTime.setTargetAtTime(Math.max(0.05, Math.min(1.0, fx.delayTime)), t, 0.02);
      this.delayFeedbackGain.gain.setTargetAtTime(Math.max(0, Math.min(0.85, fx.delayFeedback)), t, 0.02);
    } else {
      this.delayDry.gain.setTargetAtTime(1.0, t, 0.02);
      this.delayWet.gain.setTargetAtTime(0.0, t, 0.02);
      this.delayFeedbackGain.gain.setTargetAtTime(0.0, t, 0.02);
    }

    // Reverb
    if (fx.reverbEnabled) {
      const mix = Math.max(0, Math.min(1, fx.reverbMix));
      this.reverbDry.gain.setTargetAtTime(1.0 - mix * 0.4, t, 0.02);
      this.reverbWet.gain.setTargetAtTime(mix, t, 0.02);
    } else {
      this.reverbDry.gain.setTargetAtTime(1.0, t, 0.02);
      this.reverbWet.gain.setTargetAtTime(0.0, t, 0.02);
    }
  }

  private updateCurve(amount: number): void {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft tube saturation curve
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.driveShaper.curve = curve;
  }

  private generateReverbImpulse(duration: number, decay: number): void {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      const factor = Math.pow(1 - n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    this.reverbConvolver.buffer = impulse;
  }
}
