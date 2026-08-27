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
  private schedulerStepIndex = 0;
  private nextStepTime = 0;
  private currentBeatInMeasure = 0;
  private timerId: number | null = null;
  private uiTimeouts: number[] = [];
  private stopTimeout: number | null = null;
  private listeners: Set<PlaybackListener> = new Set();

  private readonly lookaheadMs = 25;
  private readonly scheduleAheadTimeSec = 0.12;

  public setSong(song: Song): void {
    this.song = song;
    if (this.currentStepIndex >= song.steps.length) {
      this.currentStepIndex = 0;
    }
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

  private clearTimeouts(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.uiTimeouts.forEach((id) => clearTimeout(id));
    this.uiTimeouts = [];
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  public play(): void {
    if (this.isPlaying) return;
    if (!this.song || this.song.steps.length === 0) return;

    const ctx = getAudioContext();
    this.isPlaying = true;
    this.clearTimeouts();

    if (this.currentStepIndex >= this.song.steps.length) {
      this.currentStepIndex = 0;
    }

    this.schedulerStepIndex = this.currentStepIndex;
    this.nextStepTime = ctx.currentTime + 0.05;
    this.currentBeatInMeasure = 0;

    this.notifyListeners();

    // Start timer loop
    this.timerId = window.setInterval(() => {
      this.scheduler();
    }, this.lookaheadMs);

    // Initial run
    this.scheduler();
  }

  public pause(): void {
    this.isPlaying = false;
    this.clearTimeouts();
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
    this.pause();
    this.currentStepIndex = 0;
    this.schedulerStepIndex = 0;
    this.currentBeatInMeasure = 0;
    this.notifyListeners();
    this.play();
  }

  public setStepIndex(index: number): void {
    if (!this.song || this.song.steps.length === 0) return;
    const clamped = Math.max(0, Math.min(this.song.steps.length - 1, index));
    this.currentStepIndex = clamped;
    this.schedulerStepIndex = clamped;
    this.notifyListeners();
  }

  private scheduler(): void {
    if (!this.song || !this.isPlaying || this.song.steps.length === 0) return;
    const ctx = getAudioContext();

    // Prevent scheduling runaway: max 12 steps per tick
    let stepsScheduledInTick = 0;

    while (
      this.nextStepTime < ctx.currentTime + this.scheduleAheadTimeSec &&
      stepsScheduledInTick < 12
    ) {
      const stepIdx = this.schedulerStepIndex;
      const step = this.song.steps[stepIdx];
      if (!step) break;

      const beats = durationToBeats(step.duration);
      const stepDurationSec = (60 / this.song.bpm) * beats;

      this.scheduleStep(step, this.nextStepTime, stepDurationSec, stepIdx);

      this.nextStepTime += stepDurationSec;
      this.currentBeatInMeasure += beats;
      stepsScheduledInTick++;

      const nextIdx = stepIdx + 1;
      if (nextIdx >= this.song.steps.length) {
        if (this.isLooping) {
          this.schedulerStepIndex = 0;
        } else {
          // Non-looping: schedule stop at song end
          const delayToStop = Math.max(0, (this.nextStepTime - ctx.currentTime) * 1000);
          this.stopTimeout = window.setTimeout(() => {
            if (this.isPlaying) {
              this.pause();
              this.currentStepIndex = 0;
              this.schedulerStepIndex = 0;
              this.notifyListeners();
            }
          }, delayToStop);

          if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
          }
          break;
        }
      } else {
        this.schedulerStepIndex = nextIdx;
      }
    }
  }

  private scheduleStep(step: Step, time: number, durationSec: number, stepIndex: number): void {
    if (!this.song) return;

    // Metronome tick
    if (this.isMetronomeEnabled) {
      const isAccent = Math.floor(this.currentBeatInMeasure) % this.song.timeSignature.numerator === 0;
      playMetronomeTick(isAccent, time);
    }

    // Play guitar chord / note
    if (step.notes && step.notes.length > 0) {
      // Natural ring-out slightly longer than step duration, but capped to avoid drone
      const noteRingSec = Math.max(0.1, Math.min(durationSec * 1.2, 1.8));
      playChord(step.notes, time, noteRingSec);
    }

    // Schedule UI update
    const ctx = getAudioContext();
    const delayToUi = Math.max(0, (time - ctx.currentTime) * 1000);
    const timeoutId = window.setTimeout(() => {
      if (this.isPlaying) {
        this.currentStepIndex = stepIndex;
        this.notifyListeners();
      }
    }, delayToUi);

    this.uiTimeouts.push(timeoutId);
    if (this.uiTimeouts.length > 50) {
      this.uiTimeouts.shift();
    }
  }
}

export const globalPlaybackEngine = new PlaybackEngine();
