from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# Phase 1: Project Scaffold - Backend Setup
app = FastAPI(
    title="FretStudio API",
    description="API for visualizing guitar scales and chords.",
    version="0.1.0",
)

# Implement CORS to allow frontend requests.
# The origins list should be updated with your frontend's actual address.
origins = [
    "*" # Use a wildcard to allow all origins during development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 1 & 2: Data Models
class Note(BaseModel):
    """Represents a single musical note."""
    name: str  # e.g., "C", "C#", "Db"
    octave: Optional[int] = None

class Scale(BaseModel):
    """Represents a musical scale."""
    name: str  # e.g., "Major", "Minor Pentatonic"
    intervals: List[int] # The steps that define the scale (e.g., Major: [2, 2, 1, 2, 2, 2, 1])

class Chord(BaseModel):
    """Represents a musical chord."""
    name: str  # e.g., "Major", "Minor"
    intervals: List[int] # e.g., Major: [0, 4, 7]
    # NEW: Represents a common fingering pattern. Format: [string, fret, finger_number]. -1 for muted string.
    fingerings: Optional[List[List[int]]] = None

class Tuning(BaseModel):
    """Represents an instrument tuning."""
    name: str
    notes: List[str] # Open string notes from lowest to highest string

class FretboardNote(BaseModel):
    """Represents a single note on the fretboard, with context."""
    note: str
    is_in_scale: bool
    is_root: bool
    # NEW: Fields for chord visualization
    is_in_chord: Optional[bool] = None
    finger: Optional[int] = None

# --- Music Theory Helpers ---
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def get_notes_from_intervals(root_note: str, intervals: List[int], is_scale: bool = True):
    """Calculates a series of notes from a root note and a list of intervals."""
    if root_note.upper() not in NOTES:
        raise HTTPException(status_code=404, detail=f"Root note '{root_note}' not found.")
    
    start_index = NOTES.index(root_note.upper())
    result_notes = [root_note.upper()]
    current_index = start_index

    # For scales, intervals are chained; for chords, they are from the root.
    if is_scale:
        for interval in intervals:
            current_index = (current_index + interval) % len(NOTES)
            result_notes.append(NOTES[current_index])
        result_notes.pop() # The last interval leads back to the octave of the root
    else: # Chord
        for interval in intervals[1:]: # First interval is the root (0)
            note_index = (start_index + interval) % len(NOTES)
            result_notes.append(NOTES[note_index])
            
    return result_notes

# --- In-Memory Database ---
# Using intervals allows us to calculate scales and chords for any root note.
db_scales = {
    "major": Scale(name="Major", intervals=[2, 2, 1, 2, 2, 2, 1]),
    "minor": Scale(name="Minor", intervals=[2, 1, 2, 2, 1, 2, 2]),
    "major_pentatonic": Scale(name="Major Pentatonic", intervals=[2, 2, 3, 2, 3]),
    "minor_pentatonic": Scale(name="Minor Pentatonic", intervals=[3, 2, 2, 3, 2]),
}

# UPDATED: Added fingering data to chords
db_chords = {
    # Open G Major chord fingering. Format: [string, fret, finger_number]
    "major": Chord(name="Major", intervals=[0, 4, 7], fingerings=[[6, 3, 2], [5, 2, 1], [4, 0, 0], [3, 0, 0], [2, 0, 0], [1, 3, 3]]),
    # Open A Minor chord fingering.
    "minor": Chord(name="Minor", intervals=[0, 3, 7], fingerings=[[6, -1, 0], [5, 0, 0], [4, 2, 2], [3, 2, 3], [2, 1, 1], [1, 0, 0]]),
    "diminished": Chord(name="Diminished", intervals=[0, 3, 6]), # No fingering added yet
}

db_tunings = {
    "standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"]),
    "drop_d_guitar": Tuning(name="Drop D Guitar", notes=["D", "A", "D", "G", "B", "E"]),
    "standard_bass": Tuning(name="Standard Bass", notes=["E", "A", "D", "G"]),
}


# --- API Endpoints ---

@app.get("/", tags=["General"])
async def root():
    """Root endpoint providing a welcome message."""
    return {"message": "Welcome to the FretStudio Backend!"}

@app.get("/scales", tags=["Music Data"], response_model=List[str])
async def get_all_scale_names():
    """Returns a list of all available scale names."""
    return [scale.name for scale in db_scales.values()]

@app.get("/scales/{root_note}/{scale_name}", tags=["Music Data"], response_model=List[str])
async def get_scale_notes(root_note: str, scale_name: str):
    """Calculates and returns the notes for a given scale and root note."""
    scale_key = scale_name.lower().replace(" ", "_")
    if scale_key not in db_scales:
        raise HTTPException(status_code=404, detail=f"Scale '{scale_name}' not found.")
    
    scale = db_scales[scale_key]
    return get_notes_from_intervals(root_note, scale.intervals, is_scale=True)

@app.get("/scales/{root_note}/{scale_name}/chords", tags=["Music Data"], response_model=List[str])
async def get_chords_in_scale(scale_notes: List[str] = Depends(get_scale_notes)):
    """
    Calculates the diatonic chords for a given scale.
    Returns a list of chord names (e.g., "C Major", "D Minor").
    """
    diatonic_chords = []
    scale_note_set = set(scale_notes)

    for scale_root_note in scale_notes:
        # For each note in the scale, try to build known chords
        for chord_type, chord_data in db_chords.items():
            chord_notes = get_notes_from_intervals(scale_root_note, chord_data.intervals, is_scale=False)
            
            # If all notes of the chord are within the scale, it's a diatonic chord
            if set(chord_notes).issubset(scale_note_set):
                diatonic_chords.append(f"{scale_root_note} {chord_data.name}")
                break # Found the matching chord type for this root, move to the next
                
    return diatonic_chords

@app.get("/chords", tags=["Music Data"], response_model=List[str])
async def get_all_chord_names():
    """Returns a list of all available chord names."""
    return [chord.name for chord in db_chords.values()]

@app.get("/chords/{root_note}/{chord_name}", tags=["Music Data"], response_model=List[str])
async def get_chord_notes(root_note: str, chord_name: str):
    """Calculates and returns the notes for a given chord and root note."""
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    
    chord = db_chords[chord_key]
    return get_notes_from_intervals(root_note, chord.intervals, is_scale=False)

@app.get("/tunings", tags=["Fretboard"], response_model=List[str])
async def get_all_tuning_names():
    """Returns a list of all available tuning names."""
    return [tuning.name for tuning in db_tunings.values()]

# RENAMED: This is your original '/fretboard/visualize' endpoint, now more specific.
@app.get("/fretboard/visualize-scale", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_scale(tuning_name: str, scale_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with notes highlighted based on a selected scale."""
    # Get the notes in the selected scale
    scale_notes = await get_scale_notes(root_note, scale_name)
    
    # Get the base fretboard layout
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

# NEW: This endpoint adds the new chord visualization functionality.
@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, chord_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with a specific chord fingering highlighted."""
    # Get the chord definition and its notes
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    if not chord.fingerings:
        raise HTTPException(status_code=404, detail=f"Fingering for '{chord_name}' not available.")

    chord_notes = await get_chord_notes(root_note, chord_name)
    
    # Get the tuning
    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    
    # Create a map of the fingering for easy lookup: {(string, fret): finger}
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            
            string_id = len(tuning.notes) - string_num # Invert for standard notation (1=high E)
            finger = fingering_map.get((string_id, fret))

            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=False, # Not relevant for chord view
                is_root=(current_note == root_note.upper()),
                is_in_chord=(finger is not None and finger >= 0),
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard


if __name__ == "__main__":
    import uvicorn
    # This will start the server when the script is run directly
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)


# --- Next Steps ---
# To run this backend server, execute the following command in your terminal
# (after activating your virtual environment):
# uvicorn FretStudioBackend:app --reload
#
# You can then access the interactive API documentation at http://127.0.0.1:8000/docs
@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, chord_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with a specific chord fingering highlighted."""
    # Get the chord definition and its notes
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    if not chord.fingerings:
        raise HTTPException(status_code=404, detail=f"Fingering for '{chord_name}' not available.")

    # --- FIX: Determine the parent scale to provide context ---
    # This is a simplified approach. A more robust solution would determine the
    # scale from the frontend, but for now, we'll assume a major scale context.
    # You could pass the scale_name as a parameter for a more robust solution.
    parent_scale_notes = await get_scale_notes(root_note, "Major")

    # Get the tuning
    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    
    # Create a map of the fingering for easy lookup: {(string, fret): finger}
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            
            string_id = len(tuning.notes) - string_num # Invert for standard notation (1=high E)
            finger = fingering_map.get((string_id, fret))

            fret_note = FretboardNote(
                note=current_note,
                # CORRECTED: Check if the note is in the parent scale
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=(finger is not None and finger >= 0),
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard
def get_notes_from_intervals(root_note: str, intervals: List[int], is_scale: bool = True):
    """Calculates a series of notes from a root note and a list of intervals."""
    # --- FIX: Standardize the root note case at the beginning ---
    root_note_upper = root_note.upper()
    if root_note_upper not in NOTES:
        raise HTTPException(status_code=404, detail=f"Root note '{root_note}' not found.")
    
    start_index = NOTES.index(root_note_upper)
    result_notes = [root_note_upper]
    current_index = start_index

    # For scales, intervals are chained; for chords, they are from the root.
    if is_scale:
        for interval in intervals:
            current_index = (current_index + interval) % len(NOTES)
            result_notes.append(NOTES[current_index])
        result_notes.pop() # The last interval leads back to the octave of the root
    else: # Chord
        for interval in intervals[1:]: # First interval is the root (0)
            note_index = (start_index + interval) % len(NOTES)
            result_notes.append(NOTES[note_index])
            
    return result_notes

@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, chord_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with a specific chord fingering highlighted."""
    # Get the chord definition and its notes
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    if not chord.fingerings:
        raise HTTPException(status_code=404, detail=f"Fingering for '{chord_name}' not available.")

    # --- FIX: Determine the correct parent scale for context ---
    parent_scale_name = "Major" # Default to Major
    if "Minor" in chord_name:
        parent_scale_name = "Minor"
    
    parent_scale_notes = await get_scale_notes(root_note, parent_scale_name)
    chord_notes = await get_chord_notes(root_note, chord_name)

    # Get the tuning
    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    
    # Create a map of the fingering for easy lookup: {(string, fret): finger}
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            
            string_id = len(tuning.notes) - string_num # Invert for standard notation (1=high E)
            finger = fingering_map.get((string_id, fret))

            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=(current_note in chord_notes), # Use calculated chord notes for accuracy
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# Phase 1: Project Scaffold - Backend Setup
app = FastAPI(
    title="FretStudio API",
    description="API for visualizing guitar scales and chords.",
    version="0.1.0",
)

# Implement CORS to allow frontend requests
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    fingerings: Optional[List[List[int]]] = None

class Tuning(BaseModel):
    name: str
    notes: List[str]

class FretboardNote(BaseModel):
    note: str
    is_in_scale: bool
    is_root: bool
    is_in_chord: Optional[bool] = None
    finger: Optional[int] = None

# --- Music Theory Helpers ---
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def get_notes_from_intervals(root_note: str, intervals: List[int], is_scale: bool = True):
    """Calculates a series of notes from a root note and a list of intervals."""
    # CORRECTED: Standardize the root note case at the beginning
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
    else: # Chord
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
    "major": Chord(name="Major", intervals=[0, 4, 7], fingerings=[[6, 3, 2], [5, 2, 1], [4, 0, 0], [3, 0, 0], [2, 0, 0], [1, 3, 3]]),
    "minor": Chord(name="Minor", intervals=[0, 3, 7], fingerings=[[6, -1, 0], [5, 0, 0], [4, 2, 2], [3, 2, 3], [2, 1, 1], [1, 0, 0]]),
    "diminished": Chord(name="Diminished", intervals=[0, 3, 6]),
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

@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, chord_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with a specific chord fingering highlighted."""
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    if not chord.fingerings:
        raise HTTPException(status_code=404, detail=f"Fingering for '{chord_name}' not available.")

    # CORRECTED: Determine the correct parent scale for context
    parent_scale_name = "Major"
    if "Minor" in chord_name:
        parent_scale_name = "Minor"
    
    parent_scale_notes = await get_scale_notes(root_note, parent_scale_name)
    chord_notes = await get_chord_notes(root_note, chord_name)

    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            string_id = len(tuning.notes) - string_num
            finger = fingering_map.get((string_id, fret))
            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=(current_note in chord_notes),
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, chord_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with a specific chord fingering highlighted."""
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    # REMOVED: The check for fingerings is no longer needed.
    # if not chord.fingerings:
    #     raise HTTPException(status_code=404, detail=f"Fingering for '{chord_name}' not available.")

    # Determine the correct parent scale for context
    parent_scale_name = "Major"
    if "Minor" in chord_name:
        parent_scale_name = "Minor"
    
    parent_scale_notes = await get_scale_notes(root_note, parent_scale_name)
    chord_notes = await get_chord_notes(root_note, chord_name)

    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    
    # CORRECTED: Handle cases where fingerings might be None
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings} if chord.fingerings else {}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            string_id = len(tuning.notes) - string_num
            finger = fingering_map.get((string_id, fret))
            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=(current_note in chord_notes),
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# Phase 1: Project Scaffold - Backend Setup
app = FastAPI(
    title="FretStudio API",
    description="API for visualizing guitar scales and chords.",
    version="0.1.0",
)

# Implement CORS to allow frontend requests
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    fingerings: Optional[List[List[int]]] = None

class Tuning(BaseModel):
    name: str
    notes: List[str]

class FretboardNote(BaseModel):
    note: str
    is_in_scale: bool
    is_root: bool
    is_in_chord: Optional[bool] = None
    finger: Optional[int] = None

# --- Music Theory Helpers ---
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def get_notes_from_intervals(root_note: str, intervals: List[int], is_scale: bool = True):
    """Calculates a series of notes from a root note and a list of intervals."""
    # CORRECTED: Standardize the root note case at the beginning
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
    else: # Chord
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
    "major": Chord(name="Major", intervals=[0, 4, 7], fingerings=[[6, 3, 2], [5, 2, 1], [4, 0, 0], [3, 0, 0], [2, 0, 0], [1, 3, 3]]),
    "minor": Chord(name="Minor", intervals=[0, 3, 7], fingerings=[[6, -1, 0], [5, 0, 0], [4, 2, 2], [3, 2, 3], [2, 1, 1], [1, 0, 0]]),
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

@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, chord_name: str, root_note: str, num_frets: int = 12):
    """Generates a fretboard with a specific chord fingering highlighted."""
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    # CORRECTED: No longer throws an error if fingerings are missing
    
    parent_scale_name = "Major"
    if "Minor" in chord_name:
        parent_scale_name = "Minor"
    
    parent_scale_notes = await get_scale_notes(root_note, parent_scale_name)
    chord_notes = await get_chord_notes(root_note, chord_name)

    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    # CORRECTED: Safely handle missing fingerings
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings} if chord.fingerings else {}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            string_id = len(tuning.notes) - string_num
            finger = fingering_map.get((string_id, fret))
            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == root_note.upper()),
                is_in_chord=(current_note in chord_notes),
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
@app.get("/fretboard/visualize-chord", tags=["Fretboard"], response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(
    tuning_name: str, 
    chord_name: str, 
    root_note: str, 
    scale_root_note: str,  # New parameter
    scale_name: str,       # New parameter
    num_frets: int = 12
):
    """Generates a fretboard with a specific chord fingering highlighted, within the context of a parent scale."""
    chord_key = chord_name.lower().replace(" ", "_")
    if chord_key not in db_chords:
        raise HTTPException(status_code=404, detail=f"Chord '{chord_name}' not found.")
    chord = db_chords[chord_key]
    
    # Use the provided scale information to get the parent scale notes
    parent_scale_notes = await get_scale_notes(scale_root_note, scale_name)
    chord_notes = await get_chord_notes(root_note, chord_name)

    tuning_key = tuning_name.lower().replace(" ", "_")
    if tuning_key not in db_tunings:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    tuning = db_tunings[tuning_key]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    fingering_map = {(f[0], f[1]): f[2] for f in chord.fingerings} if chord.fingerings else {}

    for string_num, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            note_index = (start_index + fret) % len(NOTES)
            current_note = NOTES[note_index]
            string_id = len(tuning.notes) - string_num
            finger = fingering_map.get((string_id, fret))
            fret_note = FretboardNote(
                note=current_note,
                is_in_scale=(current_note in parent_scale_notes),
                is_root=(current_note == root_note.upper()), # Root of the chord
                is_in_chord=(current_note in chord_notes),
                finger=finger if finger is not None else None
            )
            string_notes.append(fret_note)
        fretboard[string_num + 1] = string_notes
        
    return fretboard
