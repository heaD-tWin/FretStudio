import { useState, useEffect } from 'react';
import Fretboard from '../components/Fretboard';
import Selector from '../components/Selector';
import { 
  getScales, 
  getVisualizedScale,
  getChordsInScale, 
  getVoicingsForChord,
  getChordNotesForEditor,
  type FretboardAPIResponse,
  type Voicing,
  type Scale
} from '../apiService';
import { useHandedness } from '../contexts/HandednessContext';
import { useAccidentalType } from '../contexts/AccidentalTypeContext';
import { useTuning } from '../contexts/TuningContext';
import { getNoteNames, unformatNote } from '../utils/noteUtils';
import './ScaleVisualizer.css';

const FULL_SCALE_OPTION = 'Show Full Scale';

const ScaleVisualizer = () => {
  const { handedness } = useHandedness();
  const { accidentalType } = useAccidentalType();
  const { selectedTuning } = useTuning();
  const noteOptions = getNoteNames(accidentalType);

  const [scales, setScales] = useState<Scale[]>([]);
  const [chords, setChords] = useState<string[]>([]);
  const [fretboardData, setFretboardData] = useState<FretboardAPIResponse | null>(null);
  
  const [voicings, setVoicings] = useState<Voicing[]>([]);
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState<number>(-1);
  const [chordNotes, setChordNotes] = useState<string[]>([]);

  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [selectedChord, setSelectedChord] = useState<string>('');

  const chordRootNote = selectedChord ? selectedChord.split(' ')[0] : null;

  useEffect(() => {
    async function fetchInitialData() {
      const scaleData = await getScales();
      setScales(scaleData);
      if (scaleData.length > 0) setSelectedScale(scaleData[0].name);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchDiatonicChords() {
      if (selectedRoot && selectedScale && selectedTuning) {
        const rootForAPI = unformatNote(selectedRoot);
        const diatonicChords = await getChordsInScale(rootForAPI, selectedScale, selectedTuning);
        setChords(diatonicChords);
        if (selectedChord && !diatonicChords.includes(selectedChord)) {
          setSelectedChord('');
        }
      }
    }
    fetchDiatonicChords();
  }, [selectedRoot, selectedScale, selectedTuning]);

  useEffect(() => {
    async function fetchFretboardAndChordData() {
      if (selectedTuning && selectedRoot && selectedScale) {
        const rootForAPI = unformatNote(selectedRoot);
        
        const data = await getVisualizedScale(selectedTuning, rootForAPI, selectedScale);
        setFretboardData(data);

        if (selectedChord) {
          const [chordRoot, ...typeParts] = selectedChord.split(' ');
          const chordTypeName = typeParts.join(' ');
          const rootNoteForChord = unformatNote(chordRoot);

          const [fetchedVoicings, fetchedNotes] = await Promise.all([
            getVoicingsForChord(selectedTuning, chordTypeName, rootNoteForChord),
            getChordNotesForEditor(rootNoteForChord, chordTypeName)
          ]);

          setVoicings(fetchedVoicings || []);
          setChordNotes(fetchedNotes || []);
          setSelectedVoicingIndex(-1);
        } else {
          setVoicings([]);
          setChordNotes([]);
          setSelectedVoicingIndex(-1);
        }
      }
    }
    fetchFretboardAndChordData();
  }, [selectedRoot, selectedScale, selectedTuning, selectedChord]);

  const handleNextVoicing = () => {
    setSelectedVoicingIndex(prev => {
      if (prev === voicings.length - 1) return -1;
      return prev + 1;
    });
  };

  const handlePrevVoicing = () => {
    setSelectedVoicingIndex(prev => {
      if (prev === -1) return voicings.length - 1;
      if (prev === 0) return -1;
      return prev - 1;
    });
  };

  const currentVoicing = selectedVoicingIndex > -1 ? voicings[selectedVoicingIndex] : null;

  return (
    <div className="scale-visualizer-page">
      <h1>Scale Visualizer</h1>
      <div className="card">
        <h2>Fretboard Controls</h2>
        <div className="controls-grid">
          <Selector label="Root Note" value={selectedRoot} options={noteOptions} onChange={setSelectedRoot} />
          <Selector label="Scale" value={selectedScale} options={scales.map(s => s.name)} onChange={setSelectedScale} />
          <Selector label="Chord" value={selectedChord || FULL_SCALE_OPTION} options={[FULL_SCALE_OPTION, ...chords]} onChange={(value) => setSelectedChord(value === FULL_SCALE_OPTION ? '' : value)} />
        </div>
        {selectedChord && voicings.length > 0 && (
          <div className="voicing-controls">
            <button onClick={() => setSelectedVoicingIndex(-1)}>Show All Tones</button>
            <button onClick={handlePrevVoicing} disabled={voicings.length === 0}>Prev Voicing</button>
            <button onClick={handleNextVoicing} disabled={voicings.length === 0}>Next Voicing</button>
            <span>
              {currentVoicing?.name || 'All Tones'}
              {currentVoicing?.difficulty && ` (${currentVoicing.difficulty})`}
            </span>
          </div>
        )}
      </div>
      <Fretboard 
        fretboardData={fretboardData} 
        selectedVoicing={currentVoicing}
        scaleRootNote={selectedRoot}
        chordRootNote={chordRootNote}
        validNotes={chordNotes}
        isLeftHanded={handedness === 'left'}
        accidentalType={accidentalType}
      />
    </div>
  );
};

export default ScaleVisualizer;