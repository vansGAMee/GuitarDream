import { Song, Step } from '../types/music';
import { durationToBeats } from '../music/duration';
import { getAudioContext, playChord, getFxNode } from './synth';
import { playMetronomeTick } from './metronome';

export type PlaybackListener = (stepIndex: number, isPlaying: boolean) => void;

export class PlaybackEngine {
  private song: Song | null = null;
  private isPlaying = false;
  private isLooping = true;
  private isMetronomeEnabled = false;
  private currentStepIndex = 0;
  private listeners: Set<PlaybackListener> = new Set();

  private timerId: number | null = null;
  private nextStepTime = 0;
  private currentBeatInMeasure = 0;
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadTimeSec = 0.1;

  public setSong(song: Song): void {
    this.song = song;
    if (this.currentStepIndex >= song.steps.length) {
      this.currentStepIndex = 0;
    }
    // Update FX
    const fxNode = getFxNode();
    if (fxNode) {
      fxNode.updateSettings(song.fx);
    }
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
  }

  public getLoop(): boolean {
    return this.isLooping;
  }

  public setMetronome(enabled: boolean): void {
    this.isMetronomeEnabled = enabled;
  }

  public getMetronome(): boolean {
    return this.isMetronomeEnabled;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStepIndex, this.isPlaying);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.currentStepIndex, this.isPlaying));
  }

  public play(): void {
    if (this.isPlaying) return;
    if (!this.song || this.song.steps.length === 0) return;

    const ctx = getAudioContext();
    this.isPlaying = true;
    this.nextStepTime = ctx.currentTime + 0.05;
    this.currentBeatInMeasure = 0;

    // Make sure index is in range
    if (this.currentStepIndex >= this.song.steps.length) {
      this.currentStepIndex = 0;
    }

    this.notifyListeners();
    this.startScheduler();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopScheduler();
    this.notifyListeners();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public restart(): void {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.currentStepIndex = 0;
    this.currentBeatInMeasure = 0;
    this.notifyListeners();
    if (wasPlaying) {
      this.play();
    }
  }

  public setStepIndex(index: number): void {
    if (!this.song) return;
    const clamped = Math.max(0, Math.min(this.song.steps.length - 1, index));
    this.currentStepIndex = clamped;
    this.notifyListeners();
  }

  private startScheduler(): void {
    this.stopScheduler();
    const run = () => {
      this.scheduler();
      if (this.isPlaying) {
        this.timerId = window.setTimeout(run, this.lookaheadMs);
      }
    };
    run();
  }

  private stopScheduler(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduler(): void {
    if (!this.song || !this.isPlaying || this.song.steps.length === 0) return;
    const ctx = getAudioContext();

    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadTimeSec) {
      this.scheduleStep(this.song.steps[this.currentStepIndex], this.nextStepTime, this.currentStepIndex);
      this.advanceStep();
    }
  }

  private scheduleStep(step: Step, time: number, stepIndex: number): void {
    if (!this.song) return;
    const bpm = this.song.bpm;
    const beats = durationToBeats(step.duration);
    const stepDurationSec = (60 / bpm) * beats;

    // Metronome tick
    if (this.isMetronomeEnabled) {
      const isAccent = Math.floor(this.currentBeatInMeasure) % this.song.timeSignature.numerator === 0;
      playMetronomeTick(isAccent, time);
    }

    // Play guitar note / chord (if notes exist)
    if (step.notes && step.notes.length > 0) {
      playChord(step.notes, time, Math.max(stepDurationSec * 1.5, 0.4));
    }

    // Schedule UI update roughly on note hit
    const ctx = getAudioContext();
    const delayToUi = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying) {
        this.currentStepIndex = stepIndex;
        this.notifyListeners();
      }
    }, delayToUi);
  }

  private advanceStep(): void {
    if (!this.song || this.song.steps.length === 0) return;

    const currentStep = this.song.steps[this.currentStepIndex];
    const beats = durationToBeats(currentStep.duration);
    const stepDurationSec = (60 / this.song.bpm) * beats;

    this.nextStepTime += stepDurationSec;
    this.currentBeatInMeasure += beats;

    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex >= this.song.steps.length) {
      if (this.isLooping) {
        this.currentStepIndex = 0;
      } else {
        // Song finished: wait for last step duration then stop
        const lastStepSec = stepDurationSec;
        setTimeout(() => {
          if (this.isPlaying && this.currentStepIndex >= (this.song?.steps.length ?? 0) - 1) {
            this.pause();
            this.currentStepIndex = 0;
            this.notifyListeners();
          }
        }, lastStepSec * 1000);
        this.stopScheduler();
      }
    } else {
      this.currentStepIndex = nextIndex;
    }
  }
}

export const globalPlaybackEngine = new PlaybackEngine();
