import React from 'react';

interface FretboardProps {
  strings?: number;
  frets?: number;
  highlightedFrets?: { string: number; fret: number }[];
}

const DEFAULT_STRINGS = 6;
const DEFAULT_FRETS = 22;

const Fretboard: React.FC<FretboardProps> = ({
  strings = DEFAULT_STRINGS,
  frets = DEFAULT_FRETS,
  highlightedFrets = [],
}) => {
  const safeHighlightedFrets = Array.isArray(highlightedFrets) ? highlightedFrets : [];

  const renderFrets = (stringIndex: number) => {
    const fretsArray = [];
    for (let fretIndex = 0; fretIndex < frets; fretIndex++) {
      const isHighlighted = safeHighlightedFrets.some(
        (hf) => hf.string === stringIndex && hf.fret === fretIndex
      );
      fretsArray.push(
        <div
          key={`fret-${stringIndex}-${fretIndex}`}
          className={`fret${isHighlighted ? ' highlighted' : ''}`}
          style={{
            border: '1px solid #ccc',
            width: 30,
            height: 30,
            display: 'inline-block',
            background: isHighlighted ? '#ffd700' : '#fff',
          }}
        >
          {fretIndex}
        </div>
      );
    }
    return fretsArray;
  };

  return (
    <div className="fretboard" style={{ display: 'inline-block' }}>
      {Array.from({ length: strings }).map((_, stringIndex) => (
        <div
          key={`string-${stringIndex}`}
          className="string-row"
          style={{ marginBottom: 4 }}
        >
          {renderFrets(stringIndex)}
        </div>
      ))}
    </div>
  );
};

export default Fretboard;