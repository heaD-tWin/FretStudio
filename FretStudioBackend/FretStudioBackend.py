from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# --- FastAPI App Setup ---
app = FastAPI(
    title="FretStudio API",
    description="API for visualizing guitar scales and chords.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class Scale(BaseModel):
    name: str
    intervals: List[int]

class Chord(BaseModel):
    name: str
    intervals: List[int]
    # UPDATED: Now supports a list of fingerings (voicings)
    fingerings: Optional[List[List[List[int]]]] = None

class Tuning(BaseModel):
    name: str
    notes: List[str]

class FretboardNote(BaseModel):
    note: str
    is_in_scale: bool
    is_root: bool
    is_in_chord: Optional[bool] = None
    finger: Optional[int] = None

# NEW: A response model for the chord visualization endpoint
class ChordVisualizationResponse(BaseModel):
    fretboard: Dict[int, List[FretboardNote]]
    voicings: List[List[List[int]]] = []

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

# --- In-Memory Database ---
db_scales = {
    "major": Scale(name="Major", intervals=[2, 2, 1, 2, 2, 2, 1]),
    "minor": Scale(name="Minor", intervals=[2, 1, 2, 2, 1, 2, 2]),
    "major_pentatonic": Scale(name="Major Pentatonic", intervals=[2, 2, 3, 2, 3]),
    "minor_pentatonic": Scale(name="Minor Pentatonic", intervals=[3, 2, 2, 3, 2]),
}

db_chords = {
    "major": Chord(
        name="Major", 
        intervals=[0, 4, 7], 
        # UPDATED: Added multiple fingerings
        fingerings=[
            [[6, 3, 2], [5, 2, 1], [4, 0, 0], [3, 0, 0], [2, 0, 0], [1, 3, 3]], # Open G shape
            [[6, 3, 1], [5, 5, 3], [4, 5, 4], [3, 5, 2], [2, 3, 1], [1, 3, 1]], # C-shape barre at 3rd fret
        ]
    ),
    "minor": Chord(
        name="Minor", 
        intervals=[0, 3, 7], 
        fingerings=[
            [[6, -1, 0], [5, 0, 0], [4, 2, 2], [3, 2, 3], [2, 1, 1], [1, 0, 0]] # Open A minor
        ]
    ),
    "diminished": Chord(name="Diminished", intervals=[0, 3, 6]), # No fingering data
}

db_tunings = {
    "standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"]),
    "drop_d_guitar": Tuning(name="Drop D Guitar", notes=["D", "A", "D", "G", "B", "E"]),
    "standard_bass": Tuning(name="Standard Bass", notes=["E", "A", "D", "G"]),
}

# --- API Endpoints ---

@app.get("/", tags=["General"])
async def root():
    return {"message": "Welcome to the FretStudio Backend!"}

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
        for chord_type, chord_data in db_chords.items():
            chord_notes = get_notes_from_intervals(scale_root_note, chord_data.intervals, is_scale=False)
            if set(chord_notes).issubset(scale_note_set):
                diatonic_chords.append(f"{scale_root_note} {chord_data.name}")
                break
    return diatonic_chords

@app.get("/chords", tags=["Music Data"], response_model=List[str])
async def get_all_chord_names():
    return [chord.name for chord in db_chords.values()]

@app.get("/chords/{root_note}/{chord_name}", tags=["Music Data"], response_model=List[str])
async def get_chord_notes(root_note: str, chord_name: str):
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    return get_notes_from_intervals(root_note, db_chords[chord_key].intervals, is_scale=False)

@app.get("/tunings", tags=["Fretboard"], response_model=List[str])
async def get_all_tuning_names():
    return [tuning.name for tuning in db_tunings.values()]

@app.get("/fretboard/visualize-scale", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_scale(tuning_name: str, scale_name: str, root_note: str, num_frets: int = 12):
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
                is_root=(current_note == root_note.upper())
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
    return fretboard

@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=ChordVisualizationResponse)
async def get_visualized_fretboard_for_chord(
    tuning_name: str, 
    chord_name: str, 
    root_note: str, 
    scale_root_note: str,
    scale_name: str,
    num_frets: int = 12
):
    """
    Generates a fretboard with all chord tones highlighted, and returns a list
    of available voicings for that chord.
    """
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    parent_scale_notes = await get_scale_notes(scale_root_note, scale_name)
    chord_notes = await get_chord_notes(root_note, chord_name)

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
                # CORRECTED: This now correctly uses the scale's root note.
                is_root=(current_note == scale_root_note.upper()),
                is_in_chord=(current_note in chord_notes),
                finger=None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return ChordVisualizationResponse(
        fretboard=fretboard,
        voicings=chord.fingerings if chord.fingerings else []
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
