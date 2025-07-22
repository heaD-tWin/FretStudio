from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json

# --- FastAPI App Setup ---
app = FastAPI(
    title="FretStudio API",
    description="API for visualizing guitar scales and chords.",
    version="0.3.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Data Models ---
class Voicing(BaseModel):
    name: Optional[str] = None
    difficulty: Optional[str] = None
    fingering: List[List[int]]

class ChordDefinition(BaseModel):
    notes: List[str]
    voicings: List[Voicing]

class Scale(BaseModel):
    name: str
    intervals: List[int]

class Tuning(BaseModel):
    name: str
    notes: List[str]

class FretboardNote(BaseModel):
    note: str
    is_in_scale: bool
    is_root: bool
    is_in_chord: Optional[bool] = None

class ChordVisualizationResponse(BaseModel):
    fretboard: Dict[int, List[FretboardNote]]
    voicings: List[Voicing] = []

# --- Data Loading ---
def load_chord_library() -> Dict[str, ChordDefinition]:
    with open("chord_library.json", "r") as f:
        data = json.load(f)
    return {name: ChordDefinition(**value) for name, value in data.items()}

db_scales = {"major": Scale(name="Major", intervals=[2, 2, 1, 2, 2, 2, 1]), "minor": Scale(name="Minor", intervals=[2, 1, 2, 2, 1, 2, 2])}
db_chord_library = load_chord_library()
db_tunings = {"standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"])}
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# --- API Endpoints ---
@app.get("/scales", response_model=List[str])
async def get_all_scale_names():
    return [scale.name for scale in db_scales.values()]

@app.get("/scales/{root_note}/{scale_name}", response_model=List[str])
async def get_scale_notes(root_note: str, scale_name: str):
    scale_key = scale_name.lower().replace(" ", "_")
    if scale_key not in db_scales:
        raise HTTPException(status_code=404, detail=f"Scale '{scale_name}' not found.")
    
    start_index = NOTES.index(root_note.upper())
    result_notes = [root_note.upper()]
    current_index = start_index
    for interval in db_scales[scale_key].intervals:
        current_index = (current_index + interval) % len(NOTES)
        result_notes.append(NOTES[current_index])
    result_notes.pop()
    return result_notes

@app.get("/scales/{root_note}/{scale_name}/chords", response_model=List[str])
async def get_chords_in_scale(scale_notes: List[str] = Depends(get_scale_notes)):
    diatonic_chords = []
    scale_note_set = set(scale_notes)
    for chord_name, chord_data in db_chord_library.items():
        if set(chord_data.notes).issubset(scale_note_set):
            diatonic_chords.append(chord_name)
    return diatonic_chords

@app.get("/tunings", response_model=List[str])
async def get_all_tuning_names():
    return [tuning.name for tuning in db_tunings.values()]

@app.get("/fretboard/visualize-scale", response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_scale(tuning_name: str, scale_name: str, root_note: str, num_frets: int = 24):
    scale_notes = await get_scale_notes(root_note, scale_name)
    tuning = db_tunings.get(tuning_name.lower().replace(" ", "_"))
    if not tuning:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % len(NOTES)]
            string_notes.append(FretboardNote(
                note=current_note,
                is_in_scale=(current_note in scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=False
            ))
        fretboard[string_num + 1] = string_notes
    return fretboard

@app.get("/fretboard/visualize-chord", response_model=ChordVisualizationResponse)
async def get_visualized_fretboard_for_chord(
    tuning_name: str, 
    chord_name: str, 
    scale_root_note: str,
    scale_name: str,
    num_frets: int = 24
):
    chord_def = db_chord_library.get(chord_name)
    if not chord_def:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found in library.")
    
    parent_scale_notes = await get_scale_notes(scale_root_note, scale_name)
    tuning = db_tunings.get(tuning_name.lower().replace(" ", "_"))
    if not tuning:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
        
    fretboard: Dict[int, List[FretboardNote]] = {}
    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % len(NOTES)]
            string_notes.append(FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == scale_root_note.upper()),
                is_in_chord=(current_note in chord_def.notes)
            ))
        fretboard[string_num + 1] = string_notes
        
    return ChordVisualizationResponse(fretboard=fretboard, voicings=chord_def.voicings)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
