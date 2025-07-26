from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import os

# --- FastAPI App Setup ---
app = FastAPI(title="FretStudio API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Data Models ---
class Voicing(BaseModel): name: str; difficulty: str; fingering: List[List[int]]
class ChordVoicings(BaseModel): name: str; voicings: List[Voicing]
class ChordType(BaseModel): name: str; intervals: List[int]
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

# Standardize on the capitalized name as the key
db_chord_types = {v['name']: ChordType(**v) for v in load_json_data("chord_types.json").values()}
db_scales = {v['name']: Scale(**v) for v in load_json_data("scales.json").values()}
db_tunings = {"standard_guitar": Tuning(name="Standard Guitar", notes=["E", "A", "D", "G", "B", "E"])}
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Load the new hierarchical voicings library
db_voicings_library: Dict[str, Dict[str, ChordVoicings]] = {}
raw_voicings_data = load_json_data("voicings_library.json")
for type_name, notes_dict in raw_voicings_data.items():
    db_voicings_library[type_name] = {note: ChordVoicings(**voicings_data) for note, voicings_data in notes_dict.items()}

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
    scale = db_scales.get(scale_name)
    if not scale: return []
    
    scale_notes = get_notes_from_intervals(root_note, scale.intervals)
    scale_notes_set = set(scale_notes)
    
    diatonic_chords = []
    for note_in_scale in scale_notes:
        for chord_type_name in scale.allowed_chord_types:
            chord_type = db_chord_types.get(chord_type_name)
            if not chord_type: continue
            
            try:
                chord_notes = set(get_notes_from_intervals(note_in_scale, chord_type.intervals))
                if chord_notes.issubset(scale_notes_set):
                    full_chord_name = f"{note_in_scale} {chord_type.name}"
                    if db_voicings_library.get(chord_type.name, {}).get(note_in_scale):
                        diatonic_chords.append(full_chord_name)
            except (ValueError, IndexError):
                continue
                
    return diatonic_chords

# --- Chord Type Endpoints ---
@app.get("/chord-types", response_model=List[ChordType])
async def get_all_chord_types(): return list(db_chord_types.values())

@app.post("/chord-types", status_code=201)
async def add_or_update_chord_type(chord_type: ChordType):
    chord_type.name = chord_type.name.capitalize()
    db_chord_types[chord_type.name] = chord_type
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    
    # Add new type to voicings library
    if chord_type.name not in db_voicings_library:
        db_voicings_library[chord_type.name] = {}
        for note in NOTES:
            db_voicings_library[chord_type.name][note] = ChordVoicings(
                name=f"{note} {chord_type.name}", voicings=[]
            )
    write_json_data("voicings_library.json", {
        type_name: {note: voicings.dict() for note, voicings in notes_dict.items()}
        for type_name, notes_dict in db_voicings_library.items()
    })
    return {"message": f"Chord type '{chord_type.name}' saved."}

@app.delete("/chord-types/{type_name}", status_code=200)
async def delete_chord_type(type_name: str):
    if type_name not in db_chord_types: raise HTTPException(status_code=404, detail="Chord type not found.")
    del db_chord_types[type_name]
    if type_name in db_voicings_library: del db_voicings_library[type_name]
    
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    write_json_data("voicings_library.json", {
        type_name: {note: voicings.dict() for note, voicings in notes_dict.items()}
        for type_name, notes_dict in db_voicings_library.items()
    })
    return {"message": f"Chord type '{type_name}' deleted."}

# --- Voicing and Fretboard Endpoints ---
@app.get("/notes/{root_note}/{chord_type_name}", response_model=List[str])
async def get_chord_notes_for_editor(root_note: str, chord_type_name: str):
    chord_type = db_chord_types.get(chord_type_name)
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    return get_notes_from_intervals(root_note, chord_type.intervals)

@app.get("/voicings/{chord_type_name}/{root_note}", response_model=List[Voicing])
async def get_voicings_for_chord(chord_type_name: str, root_note: str):
    voicings_def = db_voicings_library.get(chord_type_name, {}).get(root_note)
    return voicings_def.voicings if voicings_def else []

@app.post("/voicings/{chord_type_name}/{root_note}", status_code=201)
async def add_or_update_voicing(chord_type_name: str, root_note: str, voicing: Voicing):
    if chord_type_name not in db_voicings_library or root_note not in db_voicings_library[chord_type_name]:
        raise HTTPException(status_code=404, detail="Chord definition not found.")
    
    voicings_list = db_voicings_library[chord_type_name][root_note].voicings
    for i, v in enumerate(voicings_list):
        if v.name == voicing.name:
            voicings_list[i] = voicing
            break
    else:
        voicings_list.append(voicing)
        
    write_json_data("voicings_library.json", {
        t_name: {n: vs.dict() for n, vs in ns_dict.items()}
        for t_name, ns_dict in db_voicings_library.items()
    })
    return {"message": f"Voicing for '{root_note} {chord_type_name}' saved."}

@app.delete("/voicings/{chord_type_name}/{root_note}/{voicing_name:path}", status_code=200)
async def delete_voicing(chord_type_name: str, root_note: str, voicing_name: str):
    if chord_type_name not in db_voicings_library or root_note not in db_voicings_library[chord_type_name]:
        raise HTTPException(status_code=404, detail="Chord definition not found.")
        
    voicings_list = db_voicings_library[chord_type_name][root_note].voicings
    original_count = len(voicings_list)
    db_voicings_library[chord_type_name][root_note].voicings = [v for v in voicings_list if v.name != voicing_name]
    
    if len(db_voicings_library[chord_type_name][root_note].voicings) == original_count:
        raise HTTPException(status_code=404, detail="Voicing not found.")
        
    write_json_data("voicings_library.json", {
        t_name: {n: vs.dict() for n, vs in ns_dict.items()}
        for t_name, ns_dict in db_voicings_library.items()
    })
    return {"message": "Voicing deleted."}

@app.get("/visualize-chord/{chord_type_name}/{root_note}", response_model=ChordVisualizationResponse)
async def get_visualized_chord(chord_type_name: str, root_note: str, scale_root_note: str, scale_name: str, tuning_name: str = "Standard Guitar", num_frets: int = 24):
    chord_def = db_voicings_library.get(chord_type_name, {}).get(root_note)
    if not chord_def: raise HTTPException(status_code=404, detail=f"Chord '{root_note} {chord_type_name}' not found.")
    
    chord_type = db_chord_types.get(chord_type_name)
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    chord_notes = get_notes_from_intervals(root_note, chord_type.intervals)
    
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

@app.get("/visualize-chord-simple/{chord_type_name}/{root_note:path}", response_model=ChordVisualizationResponse)
async def get_visualized_chord_simple(chord_type_name: str, root_note: str, tuning_name: str = "Standard Guitar", num_frets: int = 24):
    chord_def = db_voicings_library.get(chord_type_name, {}).get(root_note)
    if not chord_def: raise HTTPException(status_code=404, detail=f"Chord '{root_note} {chord_type_name}' not found.")

    chord_type = db_chord_types.get(chord_type_name)
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    
    chord_notes = get_notes_from_intervals(root_note, chord_type.intervals)
    tuning = db_tunings[tuning_name.lower().replace(" ", "_")]
    fretboard: Dict[int, List[FretboardNote]] = {}
    for i, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % 12]
            string_notes.append(FretboardNote(note=current_note, is_in_scale=False, is_root=(current_note == root_note.upper()), is_in_chord=(current_note in chord_notes)))
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
