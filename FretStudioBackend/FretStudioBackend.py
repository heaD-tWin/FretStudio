from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json

# --- FastAPI App Setup ---
app = FastAPI(
    title="FretStudio API",
    description="API for visualizing guitar scales and chords.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Data Models for chord_voicings.json ---
class Voicing(BaseModel):
    name: Optional[str] = None
    difficulty: Optional[str] = None
    fingering: List[List[int]]

class ChordDefinition(BaseModel):
    intervals: List[int]
    voicings: List[Voicing]

# --- Existing Data Models ---
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
    finger: Optional[int] = None

class ChordVisualizationResponse(BaseModel):
    fretboard: Dict[int, List[FretboardNote]]
    voicings: List[Voicing] = []

# --- Data Loading ---
def load_chord_definitions() -> Dict[str, ChordDefinition]:
    with open("chord_voicings.json", "r") as f:
        data = json.load(f)
    return {name: ChordDefinition(**value) for name, value in data.items()}

# --- In-Memory Database ---
db_scales = {
    "major": Scale(name="Major", intervals=[2, 2, 1, 2, 2, 2, 1]),
    "minor": Scale(name="Minor", intervals=[2, 1, 2, 2, 1, 2, 2]),
}
db_chords = load_chord_definitions()
db_tunings = {
    "standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"]),
    "drop_d_guitar": Tuning(name="Drop D Guitar", notes=["D", "A", "D", "G", "B", "E"]),
}

# --- Music Theory Helpers ---
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def get_notes_from_intervals(root_note: str, intervals: List[int], is_scale: bool = True):
    root_note_upper = root_note.upper()
    if root_note_upper not in NOTES:
        raise HTTPException(status_code=404, detail=f"Root note '{root_note}' not found.")
    
    start_index = NOTES.index(root_note_upper)
    result_notes = [root_note_upper]
    current_index = start_index

    if is_scale:
        for interval in intervals:
            current_index = (current_index + interval) % len(NOTES)
            result_notes.append(NOTES[current_index])
        result_notes.pop()
    else:
        for interval in intervals[1:]:
            note_index = (start_index + interval) % len(NOTES)
            result_notes.append(NOTES[note_index])
            
    return result_notes

# --- API Endpoints ---

@app.get("/scales", tags=["Music Data"], response_model=List[str])
async def get_all_scale_names():
    return [scale.name for scale in db_scales.values()]

@app.get("/scales/{root_note}/{scale_name}", tags=["Music Data"], response_model=List[str])
async def get_scale_notes(root_note: str, scale_name: str):
    scale_key = scale_name.lower().replace(" ", "_")
    if scale_key not in db_scales:
        raise HTTPException(status_code=404, detail=f"Scale '{scale_name}' not found.")
    return get_notes_from_intervals(root_note, db_scales[scale_key].intervals, is_scale=True)

@app.get("/scales/{root_note}/{scale_name}/chords", tags=["Music Data"], response_model=List[str])
async def get_chords_in_scale(scale_notes: List[str] = Depends(get_scale_notes)):
    diatonic_chords = []
    scale_note_set = set(scale_notes)
    for scale_root_note in scale_notes:
        for chord_name, chord_data in db_chords.items():
            chord_notes = get_notes_from_intervals(scale_root_note, chord_data.intervals, is_scale=False)
            if set(chord_notes).issubset(scale_note_set):
                diatonic_chords.append(f"{scale_root_note} {chord_name.capitalize()}")
                break
    return diatonic_chords

@app.get("/tunings", tags=["Fretboard"], response_model=List[str])
async def get_all_tuning_names():
    return [tuning.name for tuning in db_tunings.values()]

@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=ChordVisualizationResponse)
async def get_visualized_fretboard_for_chord(
    tuning_name: str, 
    chord_name: str, 
    root_note: str, 
    scale_root_note: str,
    scale_name: str,
    num_frets: int = 24
):
    """
    Generates a fretboard with all chord tones highlighted, and returns a list
    of available voicings for that chord.
    """
    # CORRECTED: Use the simple chord_name (e.g., "Major") to find the definition
    chord_type_key = chord_name.lower() 
    if chord_type_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord type '{chord_name}' not found.")
    chord_def = db_chords[chord_type_key]
    
    parent_scale_notes = await get_scale_notes(scale_root_note, scale_name)
    # Use the chord's actual root note for calculation
    chord_notes = get_notes_from_intervals(root_note, chord_def.intervals, is_scale=False)

    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == scale_root_note.upper()),
                is_in_chord=(current_note in chord_notes),
                finger=None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return ChordVisualizationResponse(
        fretboard=fretboard,
        voicings=chord_def.voicings
    )

@app.get("/fretboard/visualize-scale", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_scale(tuning_name: str, scale_name: str, root_note: str, num_frets: int = 24):
    """Generates a fretboard with notes highlighted based on a selected scale."""
    scale_notes = await get_scale_notes(root_note, scale_name)
    
    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    
    tuning = db_tunings[tuning_key]
    fretboard: Dict[int, List[FretboardNote]] = {}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            
            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=False,
                finger=None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
