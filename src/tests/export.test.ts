import { describe, it, expect } from 'vitest';
import { Song, createEmptySong } from '../types/music';
import { generateAsciiTab } from '../export/asciiTab';
import { generateMidiFile } from '../export/midiExport';
import { generateMusicXml } from '../export/musicXmlExport';

describe('Exports (ASCII, MIDI, MusicXML)', () => {
  const testSong: Song = {
    ...createEmptySong('Test Riff'),
    bpm: 120,
    steps: [
      {
        id: 's1',
        notes: [
          { string: 5, fret: 0 },
          { string: 4, fret: 2 },
          { string: 3, fret: 2 },
        ],
        duration: 'quarter',
      },
      {
        id: 's2',
        notes: [{ string: 5, fret: 3 }],
        duration: 'quarter',
      },
      {
        id: 's3',
        notes: [], // rest
        duration: 'half',
      },
    ],
  };

  it('generates valid ASCII tab output with 6 strings and notes aligned', () => {
    const ascii = generateAsciiTab(testSong);
    expect(ascii).toContain('Title: Test Riff');
    expect(ascii).toContain('Tempo: 120 BPM');
    expect(ascii).toContain('e|-');
    expect(ascii).toContain('B|-');
    expect(ascii).toContain('G|-');
    expect(ascii).toContain('D|-');
    expect(ascii).toContain('A|-');
    expect(ascii).toContain('E|-');
    expect(ascii).toContain('0'); // low E
    expect(ascii).toContain('2'); // A & D
  });

  it('generates valid binary MIDI file starting with MThd and containing MTrk', () => {
    const midiBytes = generateMidiFile(testSong);
    expect(midiBytes.length).toBeGreaterThan(30);

    // Check MThd header ('M', 'T', 'h', 'd' -> 0x4D, 0x54, 0x68, 0x64)
    expect(midiBytes[0]).toBe(0x4d);
    expect(midiBytes[1]).toBe(0x54);
    expect(midiBytes[2]).toBe(0x68);
    expect(midiBytes[3]).toBe(0x64);

    // Search for MTrk chunk ('M', 'T', 'r', 'k' -> 0x4D, 0x54, 0x72, 0x6B)
    const hasMTrk = Array.from(midiBytes).some((val, idx, arr) => {
      return (
        val === 0x4d &&
        arr[idx + 1] === 0x54 &&
        arr[idx + 2] === 0x72 &&
        arr[idx + 3] === 0x6b
      );
    });
    expect(hasMTrk).toBe(true);
  });

  it('generates valid MusicXML containing score-partwise, clef TAB and note technicals', () => {
    const xml = generateMusicXml(testSong);
    expect(xml).toContain('<score-partwise');
    expect(xml).toContain('<sign>TAB</sign>');
    expect(xml).toContain('<fret>0</fret>');
    expect(xml).toContain('<fret>2</fret>');
    expect(xml).toContain('<rest/>');
    expect(xml).toContain('</score-partwise>');
  });
});
