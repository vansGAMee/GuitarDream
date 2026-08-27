import { Song } from '../types/music';
import { groupStepsIntoMeasures } from '../music/measures';
import { durationToBeats } from '../music/duration';
import { noteToMidi } from '../music/midiNotes';

const STEP_NAMES = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const ALTER_VALUES = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

export function generateMusicXml(song: Song): string {
  const measures = groupStepsIntoMeasures(song.steps, song.timeSignature);
  const divisions = 4; // 1 beat = 4 divisions (16th note = 1 division)

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <movement-title>${escapeXml(song.title)}</movement-title>
  <identification>
    <creator type="composer">Fretboard Studio</creator>
    <encoding>
      <software>Fretboard Studio</software>
      <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Acoustic Guitar</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Steel Guitar</instrument-name>
      </score-instrument>
      <midi-device id="P1-I1" port="1"></midi-device>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-program>26</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
`;

  measures.forEach((measure, mIdx) => {
    xml += `    <measure number="${mIdx + 1}">\n`;

    if (mIdx === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>${song.timeSignature.numerator}</beats>
          <beat-type>${song.timeSignature.denominator}</beat-type>
        </time>
        <staves>2</staves>
        <clef number="1">
          <sign>G</sign>
          <line>2</line>
          <clef-octave-change>-1</clef-octave-change>
        </clef>
        <clef number="2">
          <sign>TAB</sign>
          <line>5</line>
        </clef>
        <staff-details number="2">
          <staff-lines>6</staff-lines>
          <staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
          <staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
          <staff-tuning line="3"><tuning-step>D</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
          <staff-tuning line="4"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
          <staff-tuning line="5"><tuning-step>B</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
          <staff-tuning line="6"><tuning-step>E</tuning-step><tuning-octave>4</tuning-octave></staff-tuning>
        </staff-details>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${song.bpm}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${song.bpm}"/>
      </direction>\n`;
    }

    if (measure.steps.length === 0) {
      const beats = (song.timeSignature.numerator / song.timeSignature.denominator) * 4;
      xml += `      <note>
        <rest/>
        <duration>${beats * divisions}</duration>
        <voice>1</voice>
        <staff>1</staff>
      </note>
      <backup>
        <duration>${beats * divisions}</duration>
      </backup>
      <note>
        <rest/>
        <duration>${beats * divisions}</duration>
        <voice>2</voice>
        <staff>2</staff>
      </note>\n`;
    } else {
      let measureTotalDuration = 0;

      // Staff 1: Standard Notation
      measure.steps.forEach(({ step }) => {
        const beats = durationToBeats(step.duration);
        const durationVal = Math.round(beats * divisions);
        measureTotalDuration += durationVal;
        const typeName = step.duration === 'sixteenth' ? '16th' : step.duration;

        if (!step.notes || step.notes.length === 0) {
          xml += `      <note>
        <rest/>
        <duration>${durationVal}</duration>
        <voice>1</voice>
        <type>${typeName}</type>
        <staff>1</staff>
      </note>\n`;
        } else {
          step.notes.forEach((note, noteIdx) => {
            const midi = noteToMidi(note);
            const noteIdxMod = midi % 12;
            const stepName = STEP_NAMES[noteIdxMod];
            const alter = ALTER_VALUES[noteIdxMod];
            const octave = Math.floor(midi / 12) - 1;

            xml += `      <note>
        ${noteIdx > 0 ? '<chord/>' : ''}
        <pitch>
          <step>${stepName}</step>
          ${alter > 0 ? `<alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationVal}</duration>
        <voice>1</voice>
        <type>${typeName}</type>
        <stem>${octave >= 4 ? 'down' : 'up'}</stem>
        <staff>1</staff>
      </note>\n`;
          });
        }
      });

      // Backup to render Staff 2: Tablature
      xml += `      <backup>
        <duration>${measureTotalDuration}</duration>
      </backup>\n`;

      measure.steps.forEach(({ step }) => {
        const beats = durationToBeats(step.duration);
        const durationVal = Math.round(beats * divisions);
        const typeName = step.duration === 'sixteenth' ? '16th' : step.duration;

        if (!step.notes || step.notes.length === 0) {
          xml += `      <note>
        <rest/>
        <duration>${durationVal}</duration>
        <voice>2</voice>
        <type>${typeName}</type>
        <staff>2</staff>
      </note>\n`;
        } else {
          step.notes.forEach((note, noteIdx) => {
            const midi = noteToMidi(note);
            const noteIdxMod = midi % 12;
            const stepName = STEP_NAMES[noteIdxMod];
            const alter = ALTER_VALUES[noteIdxMod];
            const octave = Math.floor(midi / 12) - 1;

            xml += `      <note>
        ${noteIdx > 0 ? '<chord/>' : ''}
        <pitch>
          <step>${stepName}</step>
          ${alter > 0 ? `<alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationVal}</duration>
        <voice>2</voice>
        <type>${typeName}</type>
        <staff>2</staff>
        <notations>
          <technical>
            <string>${note.string + 1}</string>
            <fret>${note.fret}</fret>
          </technical>
        </notations>
      </note>\n`;
          });
        }
      });
    }

    xml += `    </measure>\n`;
  });

  xml += `  </part>
</score-partwise>`;
  return xml;
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function downloadMusicXml(song: Song): void {
  const content = generateMusicXml(song);
  const blob = new Blob([content], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${song.title.replace(/[^a-z0-9_\-]/gi, '_')}.musicxml`;
  a.click();
  URL.revokeObjectURL(url);
}
