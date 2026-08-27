import jsPDF from 'jspdf';
import { Song } from '../types/music';
import { groupStepsIntoMeasures } from '../music/measures';

export function exportPdf(song: Song): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(song.title, marginX, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Tempo: ${song.bpm} BPM | Time: ${song.timeSignature.numerator}/${song.timeSignature.denominator} | Guitar TAB`, marginX, 26);
  doc.text(`Created with Fretboard Studio � ${new Date().toLocaleDateString()}`, marginX, 31);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginX, 34, pageWidth - marginX, 34);

  let currentY = 44;
  const staffHeight = 22; // 5 spaces between 6 lines = 4.4mm per space
  const lineSpacing = staffHeight / 5;

  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const measuresPerRow = 4;

  for (let mIdx = 0; mIdx < measures.length; mIdx += measuresPerRow) {
    if (currentY + staffHeight + 15 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      currentY = 20;
    }

    const rowMeasures = measures.slice(mIdx, mIdx + measuresPerRow);
    const measureWidth = (contentWidth - 10) / rowMeasures.length;

    // Draw TAB label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('T', marginX + 1, currentY + lineSpacing * 1.5);
    doc.text('A', marginX + 1, currentY + lineSpacing * 2.5);
    doc.text('B', marginX + 1, currentY + lineSpacing * 3.5);

    // Draw 6 staff lines
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    for (let s = 0; s < 6; s++) {
      const lineY = currentY + s * lineSpacing;
      doc.line(marginX + 8, lineY, pageWidth - marginX, lineY);
    }

    // Left bar
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.4);
    doc.line(marginX + 8, currentY, marginX + 8, currentY + staffHeight);

    // Draw measures
    let currentX = marginX + 8;

    rowMeasures.forEach((measure) => {
      const startX = currentX;
      const endX = startX + measureWidth;

      // Measure bar line
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(endX, currentY, endX, currentY + staffHeight);

      // Measure number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(`${measure.measureNumber}`, startX + 2, currentY - 2);

      // Draw notes in measure
      if (measure.steps.length > 0) {
        const stepWidth = (measureWidth - 4) / measure.steps.length;

        measure.steps.forEach(({ step }, sIdx) => {
          const noteX = startX + 4 + sIdx * stepWidth + stepWidth / 2;

          step.notes.forEach((note) => {
            const noteY = currentY + note.string * lineSpacing;
            const fretStr = note.fret.toString();

            // Background white box to clear staff line
            doc.setFillColor(255, 255, 255);
            doc.rect(noteX - 2, noteY - 2, 4, 3.5, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(20, 20, 20);
            doc.text(fretStr, noteX, noteY + 1, { align: 'center' });
          });
        });
      }

      currentX = endX;
    });

    currentY += staffHeight + 14;
  }

  doc.save(`${song.title.replace(/[^a-z0-9_\-]/gi, '_')}.pdf`);
}
