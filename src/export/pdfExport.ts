import { Song, Note } from '../types/music';
import { groupStepsIntoMeasures } from '../music/measures';
import { noteToMidi } from '../music/midiNotes';

// Diatonic white-key offsets from C
const DIATONIC_STEP_INDEX: number[] = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const IS_SHARP: boolean[] = [false, true, false, true, false, false, true, false, true, false, true, false];

function getStaffPosition(midi: number): { pos: number; isSharp: boolean } {
  const writtenMidi = midi + 12;
  const octave = Math.floor(writtenMidi / 12) - 1;
  const pitchClass = writtenMidi % 12;
  const diatonicIndex = DIATONIC_STEP_INDEX[pitchClass];
  const isSharp = IS_SHARP[pitchClass];

  const pos = (octave - 4) * 7 + diatonicIndex;
  return { pos, isSharp };
}

export async function exportPdf(song: Song): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(song.title, marginX, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Tempo: ${song.bpm} BPM | Time: ${song.timeSignature.numerator}/${song.timeSignature.denominator} | Guitar Score (Standard Notation & TAB)`, marginX, 24);
  doc.text(`Created with Fretboard Studio • ${new Date().toLocaleDateString()}`, marginX, 29);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, 32, pageWidth - marginX, 32);

  let currentY = 40;

  const standardLineSpacing = 1.8;
  const standardStaffHeight = standardLineSpacing * 4;

  const tabLineSpacing = 2.4;
  const tabStaffHeight = tabLineSpacing * 5;

  const staffGap = 8;
  const systemHeight = standardStaffHeight + staffGap + tabStaffHeight;
  const systemSpacing = 16;

  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const measuresPerRow = 3;

  for (let mIdx = 0; mIdx < measures.length; mIdx += measuresPerRow) {
    if (currentY + systemHeight + 20 > pageHeight - 15) {
      doc.addPage();
      currentY = 20;
    }

    const rowMeasures = measures.slice(mIdx, mIdx + measuresPerRow);
    const startX = marginX + 10;
    const availableWidth = contentWidth - 10;
    const measureWidth = availableWidth / rowMeasures.length;

    const stdTopY = currentY;
    const tabTopY = currentY + standardStaffHeight + staffGap;

    // SYSTEM BRACE
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.8);
    doc.line(startX, stdTopY, startX, tabTopY + tabStaffHeight);

    // CLEFS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('G', marginX + 2, stdTopY + standardStaffHeight - 1);
    doc.setFontSize(7);
    doc.text('8', marginX + 7, stdTopY + standardStaffHeight + 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    doc.text('T', marginX + 3, tabTopY + tabLineSpacing * 1.5);
    doc.text('A', marginX + 3, tabTopY + tabLineSpacing * 2.8);
    doc.text('B', marginX + 3, tabTopY + tabLineSpacing * 4.1);

    // 5 STANDARD STAFF LINES
    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.2);
    for (let s = 0; s < 5; s++) {
      const lineY = stdTopY + s * standardLineSpacing;
      doc.line(startX, lineY, startX + availableWidth, lineY);
    }

    // 6 TAB STAFF LINES
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
    for (let s = 0; s < 6; s++) {
      const lineY = tabTopY + s * tabLineSpacing;
      doc.line(startX, lineY, startX + availableWidth, lineY);
    }

    // MEASURES
    let currentX = startX;

    rowMeasures.forEach((measure) => {
      const mStartX = currentX;
      const mEndX = mStartX + measureWidth;

      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.35);
      doc.line(mEndX, stdTopY, mEndX, stdTopY + standardStaffHeight);
      doc.line(mEndX, tabTopY, mEndX, tabTopY + tabStaffHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`${measure.measureNumber}`, mStartX + 2, stdTopY - 2);

      if (measure.steps.length > 0) {
        const stepWidth = (measureWidth - 4) / measure.steps.length;

        measure.steps.forEach(({ step }, sIdx) => {
          const stepCenterX = mStartX + 4 + sIdx * stepWidth + stepWidth / 2;

          if (!step.notes || step.notes.length === 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text('𝄽', stepCenterX, stdTopY + standardStaffHeight / 2 + 1, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('-', stepCenterX, tabTopY + tabStaffHeight / 2 + 1, { align: 'center' });
          } else {
            step.notes.forEach((note: Note) => {
              const midi = noteToMidi(note);
              const { pos, isSharp } = getStaffPosition(midi);
              const noteY = stdTopY + standardStaffHeight - (pos - 2) * (standardLineSpacing / 2);

              // Ledger lines
              if (pos < 2) {
                for (let lp = 0; lp >= pos; lp -= 2) {
                  const ledgerY = stdTopY + standardStaffHeight - (lp - 2) * (standardLineSpacing / 2);
                  doc.setDrawColor(100, 100, 100);
                  doc.setLineWidth(0.3);
                  doc.line(stepCenterX - 2.5, ledgerY, stepCenterX + 2.5, ledgerY);
                }
              } else if (pos > 10) {
                for (let lp = 12; lp <= pos; lp += 2) {
                  const ledgerY = stdTopY + standardStaffHeight - (lp - 2) * (standardLineSpacing / 2);
                  doc.setDrawColor(100, 100, 100);
                  doc.setLineWidth(0.3);
                  doc.line(stepCenterX - 2.5, ledgerY, stepCenterX + 2.5, ledgerY);
                }
              }

              // Sharp
              if (isSharp) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(20, 20, 20);
                doc.text('#', stepCenterX - 2.5, noteY + 1, { align: 'right' });
              }

              // Note Head
              doc.setFillColor(20, 20, 20);
              doc.setDrawColor(20, 20, 20);
              doc.ellipse(stepCenterX, noteY, 1.2, 0.9, 'F');

              // Stem
              doc.setLineWidth(0.3);
              const stemUp = pos < 6;
              const stemX = stemUp ? stepCenterX + 1.1 : stepCenterX - 1.1;
              const stemEndY = stemUp ? noteY - 6.5 : noteY + 6.5;
              doc.line(stemX, noteY, stemX, stemEndY);

              // Flag
              if (step.duration === 'eighth' || step.duration === 'sixteenth') {
                doc.line(stemX, stemEndY, stemX + (stemUp ? 2 : -2), stemEndY + (stemUp ? 2 : -2));
                if (step.duration === 'sixteenth') {
                  const flag2Y = stemEndY + (stemUp ? 2 : -2);
                  doc.line(stemX, flag2Y, stemX + (stemUp ? 2 : -2), flag2Y + (stemUp ? 2 : -2));
                }
              }

              // TAB
              const tabNoteY = tabTopY + note.string * tabLineSpacing;
              const fretStr = note.fret.toString();

              doc.setFillColor(255, 255, 255);
              doc.rect(stepCenterX - 2, tabNoteY - 1.5, 4, 3, 'F');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(20, 20, 20);
              doc.text(fretStr, stepCenterX, tabNoteY + 0.8, { align: 'center' });
            });
          }
        });
      }

      currentX = mEndX;
    });

    currentY += systemHeight + systemSpacing;
  }

  doc.save(`${song.title.replace(/[^a-z0-9_\-]/gi, '_')}_Score.pdf`);
}
