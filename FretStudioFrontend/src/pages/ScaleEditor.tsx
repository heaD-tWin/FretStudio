import React, { useState } from 'react';

interface Scale {
  name: string;
  notes: string[];
}

const defaultScales: Scale[] = [
  { name: 'Major', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { name: 'Minor', notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'] },
];

const ScaleEditor: React.FC = () => {
  const [scales, setScales] = useState<Scale[]>(defaultScales);
  const [selectedScale, setSelectedScale] = useState<number>(0);
  const [newScaleName, setNewScaleName] = useState('');
  const [newScaleNotes, setNewScaleNotes] = useState('');

  const handleAddScale = () => {
    if (newScaleName && newScaleNotes) {
      setScales([
        ...scales,
        {
          name: newScaleName,
          notes: newScaleNotes.split(',').map(n => n.trim()),
        },
      ]);
      setNewScaleName('');
      setNewScaleNotes('');
    }
  };

  const handleSelectScale = (index: number) => {
    setSelectedScale(index);
  };

  return (
    <div>
      <h1>Scale Editor</h1>
      <div>
        <h2>Scales</h2>
        <ul>
          {scales.map((scale, idx) => (
            <li
              key={scale.name}
              style={{
                cursor: 'pointer',
                fontWeight: selectedScale === idx ? 'bold' : 'normal',
              }}
              onClick={() => handleSelectScale(idx)}
            >
              {scale.name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Edit Scale</h2>
        <div>
          <strong>Name:</strong> {scales[selectedScale]?.name}
        </div>
        <div>
          <strong>Notes:</strong> {scales[selectedScale]?.notes.join(', ')}
        </div>
      </div>
      <div>
        <h2>Add New Scale</h2>
        <input
          type="text"
          placeholder="Scale Name"
          value={newScaleName}
          onChange={e => setNewScaleName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Notes (comma separated)"
          value={newScaleNotes}
          onChange={e => setNewScaleNotes(e.target.value)}
        />
        <button onClick={handleAddScale}>Add Scale</button>
      </div>
    </div>
  );
};

export default ScaleEditor;