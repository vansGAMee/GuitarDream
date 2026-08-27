import { Step, TimeSignature } from '../types/music';
import { durationToBeats } from './duration';

export type StepWithIndex = {
  step: Step;
  globalIndex: number;
  beatOffsetInMeasure: number;
};

export type Measure = {
  measureNumber: number; // 1-indexed
  steps: StepWithIndex[];
  totalBeats: number;
  maxBeats: number;
};

export function groupStepsIntoMeasures(steps: Step[], timeSignature: TimeSignature): Measure[] {
  const beatsPerMeasure = (timeSignature.numerator / timeSignature.denominator) * 4;
  const measures: Measure[] = [];

  let currentMeasureNumber = 1;
  let currentSteps: StepWithIndex[] = [];
  let currentBeats = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepBeats = durationToBeats(step.duration);

    // If adding this step exceeds measure and measure has items, close current measure
    if (currentBeats + stepBeats > beatsPerMeasure + 0.0001 && currentSteps.length > 0) {
      measures.push({
        measureNumber: currentMeasureNumber,
        steps: currentSteps,
        totalBeats: currentBeats,
        maxBeats: beatsPerMeasure,
      });
      currentMeasureNumber++;
      currentSteps = [];
      currentBeats = 0;
    }

    currentSteps.push({
      step,
      globalIndex: i,
      beatOffsetInMeasure: currentBeats,
    });
    currentBeats += stepBeats;

    // If exactly reaches measure end, close measure
    if (Math.abs(currentBeats - beatsPerMeasure) < 0.0001) {
      measures.push({
        measureNumber: currentMeasureNumber,
        steps: currentSteps,
        totalBeats: currentBeats,
        maxBeats: beatsPerMeasure,
      });
      currentMeasureNumber++;
      currentSteps = [];
      currentBeats = 0;
    }
  }

  // If there's an open partial measure remaining, or if there are no steps at all
  if (currentSteps.length > 0 || measures.length === 0) {
    measures.push({
      measureNumber: currentMeasureNumber,
      steps: currentSteps,
      totalBeats: currentBeats,
      maxBeats: beatsPerMeasure,
    });
  }

  return measures;
}
