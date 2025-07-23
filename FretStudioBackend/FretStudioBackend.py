from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import os

# --- FastAPI App Setup ---
app = FastAPI(title="FretStudio API", version="1.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Data Models ---
class ChordType(BaseModel): name: str; intervals: List[int]
class Voicing(BaseModel): name: str; difficulty: str; fingering: List[List[int]]
class ChordDefinition(BaseModel): voicings: List[Voicing]
class Scale(BaseModel): name: str; intervals: List[int]
class Tuning(BaseModel): name: str; notes: List[str]
class FretboardNote(BaseModel): note: str; is_in_scale: bool; is_root: bool; is_in_chord: bool
class ChordVisualizationResponse(BaseModel): fretboard: Dict[int, List[FretboardNote]]; voicings: List[Voicing]

# --- Data Loading ---
__location__ = os.path.realpath(os.path.join(os.getcwd(), os.path.dirname(__file__)))
def load_json_data(file_path: str):
    full_path = os.path.join(__location__, file_path)
    with open(full_path, "r") as f: return json.load(f)
def write_json_data(file_path: str, data):
    full_path = os.path.join(__location__, file_path)
    with open(full_path, "w") as f: json.dump(data, f, indent=2)

db_chord_types = {k: ChordType(**v) for k, v in load_json_data("chord_types.json").items()}
db_voicings_library = {k: ChordDefinition(**v) for k, v in load_json_data("voicings_library.json").items()}
db_scales = {"major": Scale(name="Major", intervals=[2, 2, 1, 2, 2, 2, 1]), "minor": Scale(name="Minor", intervals=[2,1, 2, 2, 1, 2, 2])}
db_tunings = {"standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"])}
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# --- Music Theory Helpers ---
def get_notes_from_intervals(root_note: str, intervals: List[int]):
    start_index = NOTES.index(root_note.upper())
    return [NOTES[(start_index + i) % 12] for i in intervals]

# --- API Endpoints ---
@app.get("/scales", response_model=List[str])
async def get_all_scale_names(): return [s.name for s in db_scales.values()]
@app.get("/tunings", response_model=List[str])
async def get_all_tuning_names(): return [t.name for t in db_tunings.values()]

# --- Chord Type Endpoints ---
@app.get("/chord-types", response_model=List[ChordType])
async def get_all_chord_types(): return list(db_chord_types.values())

@app.post("/chord-types", status_code=201)
async def add_or_update_chord_type(chord_type: ChordType):
    db_chord_types[chord_type.name.lower()] = chord_type
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    return {"message": f"Chord type '{chord_type.name}' saved."}

@app.delete("/chord-types/{type_name}", status_code=200)
async def delete_chord_type(type_name: str):
    type_name_lower = type_name.lower()
    if type_name_lower not in db_chord_types:
        raise HTTPException(status_code=404, detail="Chord type not found.")
    del db_chord_types[type_name_lower]
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    return {"message": f"Chord type '{type_name}' deleted."}

# --- Voicing and Fretboard Endpoints ---
@app.get("/notes/{root_note}/{chord_type_name}", response_model=List[str])
async def get_chord_notes_for_editor(root_note: str, chord_type_name: str):
    chord_type = db_chord_types.get(chord_type_name.lower())
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    return get_notes_from_intervals(root_note, chord_type.intervals)

@app.get("/voicings", response_model=List[str])
async def get_all_chord_names_from_library(): return list(db_voicings_library.keys())

@app.get("/voicings/{full_chord_name}", response_model=List[Voicing])
async def get_voicings_for_chord(full_chord_name: str):
    return db_voicings_library.get(full_chord_name, ChordDefinition(voicings=[])).voicings

@app.post("/voicings/{full_chord_name}", status_code=201)
async def add_or_update_voicing(full_chord_name: str, voicing: Voicing):
    if full_chord_name in db_voicings_library:
        existing_voicings = db_voicings_library[full_chord_name].voicings
        # Check if a voicing with the same name exists and update it
        for i, v in enumerate(existing_voicings):
            if v.name == voicing.name:
                existing_voicings[i] = voicing
                break
        else: # If no break, append as a new voicing
            existing_voicings.append(voicing)
    else:
        db_voicings_library[full_chord_name] = ChordDefinition(voicings=[voicing])
    
    write_json_data("voicings_library.json", {k: v.dict() for k, v in db_voicings_library.items()})
    return {"message": f"Voicing for '{full_chord_name}' saved."}

@app.delete("/voicings/{full_chord_name}/{voicing_name}", status_code=200)
async def delete_voicing(full_chord_name: str, voicing_name: str):
    if full_chord_name not in db_voicings_library:
        raise HTTPException(status_code=404, detail="Chord not found.")
    
    original_count = len(db_voicings_library[full_chord_name].voicings)
    db_voicings_library[full_chord_name].voicings = [v for v in db_voicings_library[full_chord_name].voicings if v.name != voicing_name]
    
    if len(db_voicings_library[full_chord_name].voicings) == original_count:
        raise HTTPException(status_code=404, detail="Voicing not found.")
    
    if not db_voicings_library[full_chord_name].voicings:
        del db_voicings_library[full_chord_name]
        
    write_json_data("voicings_library.json", {k: v.dict() for k, v in db_voicings_library.items()})
    return {"message": "Voicing deleted."}

@app.get("/visualize-chord/{full_chord_name}", response_model=ChordVisualizationResponse)
async def get_visualized_chord(full_chord_name: str, scale_root_note: str, scale_name: str, tuning_name: str = "Standard Guitar", num_frets: int = 24):
    if full_chord_name not in db_voicings_library:
        raise HTTPException(status_code=404, detail=f"Chord '{full_chord_name}' not found in library.")
    
    chord_def = db_voicings_library[full_chord_name]
    root_note, chord_type_name = full_chord_name.split(" ", 1)
    chord_notes = get_notes_from_intervals(root_note, db_chord_types[chord_type_name.lower()].intervals)
    scale_notes = get_notes_from_intervals(scale_root_note, db_scales[scale_name.lower()].intervals)
    tuning = db_tunings[tuning_name.lower().replace(" ", "_")]
    
    fretboard: Dict[int, List[FretboardNote]] = {}
    for i, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % 12]
            string_notes.append(FretboardNote(note=current_note, is_in_scale=(current_note in scale_notes), is_root=(current_note == scale_root_note.upper()), is_in_chord=(current_note in chord_notes)))
        fretboard[len(tuning.notes) - i] = string_notes
        
    return ChordVisualizationResponse(fretboard=fretboard, voicings=chord_def.voicings)

@app.get("/fretboard/visualize-scale", response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_scale(tuning_name: str, root_note: str, scale_name: str, num_frets: int = 24):
    scale_notes = get_notes_from_intervals(root_note, db_scales[scale_name.lower()].intervals)
    tuning = db_tunings[tuning_name.lower().replace(" ", "_")]
    fretboard: Dict[int, List[FretboardNote]] = {}
    for i, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % 12]
            string_notes.append(FretboardNote(note=current_note, is_in_scale=(current_note in scale_notes), is_root=(current_note == root_note.upper()), is_in_chord=False))
        fretboard[len(tuning.notes) - i] = string_notes
    return fretboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
