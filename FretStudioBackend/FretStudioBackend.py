from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import os

# --- FastAPI App Setup ---
app = FastAPI(title="FretStudio API", version="1.4.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Data Models ---
class ChordType(BaseModel): name: str; intervals: List[int]
class Voicing(BaseModel): name: str; difficulty: str; fingering: List[List[int]]
class ChordDefinition(BaseModel): voicings: List[Voicing]
class Scale(BaseModel): name: str; intervals: List[int]; allowed_chord_types: List[str]
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
db_scales = {k: Scale(**v) for k, v in load_json_data("scales.json").items()}
db_tunings = {"standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"])}
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# --- Music Theory Helpers ---
def get_notes_from_intervals(root_note: str, intervals: List[int]):
    start_index = NOTES.index(root_note.upper())
    return [NOTES[(start_index + i) % 12] for i in intervals]

# --- API Endpoints ---
@app.get("/tunings", response_model=List[str])
async def get_all_tuning_names(): return [t.name for t in db_tunings.values()]

# --- Scale Endpoints ---
@app.get("/scales", response_model=List[Scale])
async def get_all_scales(): return list(db_scales.values())

@app.post("/scales", status_code=201)
async def add_or_update_scale(scale: Scale):
    db_scales[scale.name] = scale
    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})
    return {"message": f"Scale '{scale.name}' saved."}

@app.delete("/scales/{scale_name}", status_code=200)
async def delete_scale(scale_name: str):
    if scale_name not in db_scales: raise HTTPException(status_code=404, detail="Scale not found.")
    del db_scales[scale_name]
    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})
    return {"message": f"Scale '{scale_name}' deleted."}

@app.get("/scales/{root_note}/{scale_name}/chords", response_model=List[str])
async def get_chords_in_scale(root_note: str, scale_name: str):
    if scale_name not in db_scales: return []
    scale = db_scales[scale_name]
    scale_notes = set(get_notes_from_intervals(root_note, scale.intervals))
    
    allowed_chords = []
    for full_chord_name in db_voicings_library.keys():
        try:
            chord_root, chord_type_name = full_chord_name.split(" ", 1)
            
            # Find the chord type definition
            chord_type = db_chord_types.get(chord_type_name.lower())
            if not chord_type: continue

            # Check if the chord type is allowed by the scale's rules
            if chord_type.name not in scale.allowed_chord_types:
                continue

            # Calculate all notes in the chord
            chord_notes = set(get_notes_from_intervals(chord_root, chord_type.intervals))

            # Check if all chord notes are present in the scale notes
            if chord_notes.issubset(scale_notes):
                allowed_chords.append(full_chord_name)

        except ValueError:
            # Skip any chord names that don't fit the "Root Type" format
            continue
            
    return allowed_chords

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
    if type_name.lower() not in db_chord_types: raise HTTPException(status_code=404, detail="Chord type not found.")
    del db_chord_types[type_name.lower()]
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    return {"message": f"Chord type '{type_name}' deleted."}

# --- Voicing and Fretboard Endpoints ---
@app.get("/notes/{root_note}/{chord_type_name}", response_model=List[str])
async def get_chord_notes_for_editor(root_note: str, chord_type_name: str):
    chord_type = db_chord_types.get(chord_type_name.lower())
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    return get_notes_from_intervals(root_note, chord_type.intervals)

@app.get("/voicings/{full_chord_name}", response_model=List[Voicing])
async def get_voicings_for_chord(full_chord_name: str):
    return db_voicings_library.get(full_chord_name, ChordDefinition(voicings=[])).voicings

@app.post("/voicings/{full_chord_name}", status_code=201)
async def add_or_update_voicing(full_chord_name: str, voicing: Voicing):
    if full_chord_name in db_voicings_library:
        voicings = db_voicings_library[full_chord_name].voicings
        for i, v in enumerate(voicings):
            if v.name == voicing.name: voicings[i] = voicing; break
        else: voicings.append(voicing)
    else: db_voicings_library[full_chord_name] = ChordDefinition(voicings=[voicing])
    write_json_data("voicings_library.json", {k: v.dict() for k, v in db_voicings_library.items()})
    return {"message": f"Voicing for '{full_chord_name}' saved."}

@app.delete("/voicings/{full_chord_name}/{voicing_name}", status_code=200)
async def delete_voicing(full_chord_name: str, voicing_name: str):
    if full_chord_name not in db_voicings_library: raise HTTPException(status_code=404, detail="Chord not found.")
    voicings = db_voicings_library[full_chord_name].voicings
    original_count = len(voicings)
    db_voicings_library[full_chord_name].voicings = [v for v in voicings if v.name != voicing_name]
    if len(db_voicings_library[full_chord_name].voicings) == original_count: raise HTTPException(status_code=404, detail="Voicing not found.")
    if not db_voicings_library[full_chord_name].voicings: del db_voicings_library[full_chord_name]
    write_json_data("voicings_library.json", {k: v.dict() for k, v in db_voicings_library.items()})
    return {"message": "Voicing deleted."}

@app.get("/visualize-chord/{full_chord_name}", response_model=ChordVisualizationResponse)
async def get_visualized_chord(full_chord_name: str, scale_root_note: str, scale_name: str, tuning_name: str = "Standard Guitar", num_frets: int = 24):
    if full_chord_name not in db_voicings_library: raise HTTPException(status_code=404, detail=f"Chord '{full_chord_name}' not found in library.")
    chord_def = db_voicings_library[full_chord_name]
    root_note, chord_type_name = full_chord_name.split(" ", 1)
    chord_notes = get_notes_from_intervals(root_note, db_chord_types[chord_type_name.lower()].intervals)
    scale = db_scales.get(scale_name)
    if not scale: raise HTTPException(status_code=404, detail="Scale not found")
    scale_notes = get_notes_from_intervals(scale_root_note, scale.intervals)
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
    scale = db_scales.get(scale_name)
    if not scale: raise HTTPException(status_code=404, detail="Scale not found")
    scale_notes = get_notes_from_intervals(root_note, scale.intervals)
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
