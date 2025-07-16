import React from 'react';
import './Fretboard.css';
import type { FretboardAPIResponse } from '../apiService';

interface FretboardProps {
  fretboardData: FretboardAPIResponse | null;
}

const DEFAULT_STRINGS = 6;
const DEFAULT_FRETS = 12;

const Fretboard = ({ fretboardData }: FretboardProps) => {
  const renderFrets = (stringIndex: number) => {
    const fretsArray = [];
    const stringKey = String(stringIndex + 1);
    const stringNotes = fretboardData ? fretboardData[stringKey] : [];

    for (let fretIndex = 0; fretIndex <= DEFAULT_FRETS; fretIndex++) {
      const note = stringNotes ? stringNotes[fretIndex] : null;

      const fretClasses = ['fret'];
      if (note) {
        if (note.is_in_chord) fretClasses.push('in-chord');
        else if (note.is_in_scale) fretClasses.push('in-scale');
        if (note.is_root) fretClasses.push('root-note');
      }

      fretsArray.push(
        <div key={`fret-${stringIndex}-${fretIndex}`} className={fretClasses.join(' ')}>
          <div className="note-name">{note ? note.note : ''}</div>
        </div>
      );
    }
    return fretsArray;
  };

  const renderStrings = () => {
    const stringsArray = [];
    for (let i = 0; i < DEFAULT_STRINGS; i++) {
      stringsArray.push(
        <div key={`string-${i}`} className="string-row">
          {renderFrets(i)}
        </div>
      );
    }
    return stringsArray;
  };

  return (
    <div className="fretboard-container">
      <div className="fretboard">{renderStrings()}</div>
    </div>
  );
};

export default Fretboard;