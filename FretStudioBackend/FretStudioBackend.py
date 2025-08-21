from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
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
class FretboardNote(BaseModel): 
    note: str
    is_in_scale: bool
    is_root: bool
    is_in_chord: bool
    interval_degree: Optional[int] = None
class ChordVisualizationResponse(BaseModel): fretboard: Dict[int, List[FretboardNote]]; voicings: List[Voicing]

class ReorderRequest(BaseModel):
    name: str
    direction: str

# --- Data Loading ---
__location__ = os.path.realpath(os.path.join(os.getcwd(), os.path.dirname(__file__)))
def load_json_data(file_path: str):
    full_path = os.path.join(__location__, file_path)
    try:
        with open(full_path, "r") as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
def write_json_data(file_path: str, data):
    full_path = os.path.join(__location__, file_path)
    with open(full_path, "w") as f: json.dump(data, f, indent=2)

db_chord_types = {v['name']: ChordType(**v) for v in load_json_data("chord_types.json").values()}
db_scales = {v['name']: Scale(**v) for v in load_json_data("scales.json").values()}
db_tunings = {name: Tuning(name=name, **data) for name, data in load_json_data("tunings.json").items()}
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

db_voicings_library: Dict[str, Dict[str, Dict[str, ChordVoicings]]] = {}
raw_voicings_data = load_json_data("voicings_library.json")
for tuning_name, tuning_data in raw_voicings_data.items():
    db_voicings_library[tuning_name] = {}
    for type_name, notes_dict in tuning_data.items():
        db_voicings_library[tuning_name][type_name] = {
            note: ChordVoicings(**voicings_data) for note, voicings_data in notes_dict.items()
        }

def save_voicings_library():
    data_to_save = {
        t_name: {
            c_name: {n: vs.dict() for n, vs in n_dict.items()}
            for c_name, n_dict in c_dict.items()
        }
        for t_name, c_dict in db_voicings_library.items()
    }
    write_json_data("voicings_library.json", data_to_save)

def get_notes_from_intervals(root_note: str, intervals: List[int]):
    start_index = NOTES.index(root_note.upper())
    return [NOTES[(start_index + (i - 1)) % 12] for i in intervals]

# --- API Endpoints ---
@app.get("/tunings", response_model=List[Tuning])
async def get_tunings():
    return list(db_tunings.values())

@app.post("/tunings", status_code=201)
async def add_or_update_tuning(tuning: Tuning):
    db_tunings[tuning.name] = tuning
    write_json_data("tunings.json", {name: t.dict(exclude={'name'}) for name, t in db_tunings.items()})

    if tuning.name not in db_voicings_library:
        db_voicings_library[tuning.name] = {}
        for ct_name in db_chord_types:
            db_voicings_library[tuning.name][ct_name] = {
                note: ChordVoicings(name=f"{note} {ct_name}", voicings=[]) for note in NOTES
            }
        save_voicings_library()
    
    return {"message": f"Tuning '{tuning.name}' saved."}

@app.delete("/tunings/{tuning_name}", status_code=200)
async def delete_tuning(tuning_name: str):
    if tuning_name not in db_tunings:
        raise HTTPException(status_code=404, detail="Tuning not found.")
    del db_tunings[tuning_name]
    write_json_data("tunings.json", {name: t.dict(exclude={'name'}) for name, t in db_tunings.items()})

    if tuning_name in db_voicings_library:
        del db_voicings_library[tuning_name]
        save_voicings_library()

    return {"message": f"Tuning '{tuning_name}' deleted."}

@app.post("/tunings/reorder", status_code=200)
async def reorder_tuning(req: ReorderRequest):
    global db_tunings
    
    if req.name not in db_tunings:
        raise HTTPException(status_code=404, detail="Tuning to reorder not found.")

    tunings_list = list(db_tunings.items())
    
    try:
        idx = [t[0] for t in tunings_list].index(req.name)
    except ValueError:
        raise HTTPException(status_code=404, detail="Tuning name mismatch in list.")

    if req.direction == "up":
        if idx == 0: return {"message": "Tuning is already at the top."}
        tunings_list.insert(idx - 1, tunings_list.pop(idx))
    elif req.direction == "down":
        if idx == len(tunings_list) - 1: return {"message": "Tuning is already at the bottom."}
        tunings_list.insert(idx + 1, tunings_list.pop(idx))
    else:
        raise HTTPException(status_code=400, detail="Invalid direction. Must be 'up' or 'down'.")

    new_db_tunings = {name: Tuning(name=name, **data.dict(exclude={'name'})) for name, data in [(k, db_tunings[k]) for k,v in tunings_list]}
    db_tunings = new_db_tunings
    write_json_data("tunings.json", {name: t.dict(exclude={'name'}) for name, t in db_tunings.items()})
    
    return {"message": f"Tuning '{req.name}' moved {req.direction}."}

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

# --- NEW ENDPOINT for reordering scales ---
@app.post("/scales/reorder", status_code=200)
async def reorder_scale(req: ReorderRequest):
    global db_scales

    if req.name not in db_scales:
        raise HTTPException(status_code=404, detail="Scale to reorder not found.")

    scales_list = list(db_scales.items())

    try:
        idx = [s[0] for s in scales_list].index(req.name)
    except ValueError:
        raise HTTPException(status_code=404, detail="Scale name mismatch in list.")

    if req.direction == "up":
        if idx == 0: return {"message": "Scale is already at the top."}
        scales_list.insert(idx - 1, scales_list.pop(idx))
    elif req.direction == "down":
        if idx == len(scales_list) - 1: return {"message": "Scale is already at the bottom."}
        scales_list.insert(idx + 1, scales_list.pop(idx))
    else:
        raise HTTPException(status_code=400, detail="Invalid direction. Must be 'up' or 'down'.")

    new_db_scales = {name: data for name, data in scales_list}
    db_scales = new_db_scales
    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})

    return {"message": f"Scale '{req.name}' moved {req.direction}."}

@app.get("/scales/{root_note}/{scale_name}/chords", response_model=List[str])
async def get_chords_in_scale(root_note: str, scale_name: str, tuning_name: str = "Standard Guitar"):
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
                    if db_voicings_library.get(tuning_name, {}).get(chord_type.name, {}).get(note_in_scale):
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
    
    for tuning_name in db_voicings_library:
        if chord_type.name not in db_voicings_library[tuning_name]:
            db_voicings_library[tuning_name][chord_type.name] = {
                note: ChordVoicings(name=f"{note} {chord_type.name}", voicings=[]) for note in NOTES
            }
    save_voicings_library()
    return {"message": f"Chord type '{chord_type.name}' saved."}

@app.delete("/chord-types/{type_name}", status_code=200)
async def delete_chord_type(type_name: str):
    if type_name not in db_chord_types: raise HTTPException(status_code=404, detail="Chord type not found.")
    del db_chord_types[type_name]
    
    for tuning_name in db_voicings_library:
        if type_name in db_voicings_library[tuning_name]:
            del db_voicings_library[tuning_name][type_name]
    
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    save_voicings_library()
    return {"message": f"Chord type '{type_name}' deleted."}

# --- Voicing and Fretboard Endpoints ---
@app.get("/notes/{root_note}/{chord_type_name}", response_model=List[str])
async def get_chord_notes_for_editor(root_note: str, chord_type_name: str):
    chord_type = db_chord_types.get(chord_type_name)
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    return get_notes_from_intervals(root_note, chord_type.intervals)

@app.get("/voicings/{tuning_name}/{chord_type_name}/{root_note}", response_model=List[Voicing])
async def get_voicings_for_chord(tuning_name: str, chord_type_name: str, root_note: str):
    voicings_def = db_voicings_library.get(tuning_name, {}).get(chord_type_name, {}).get(root_note)
    return voicings_def.voicings if voicings_def else []

@app.post("/voicings/{tuning_name}/{chord_type_name}/{root_note}", status_code=201)
async def add_or_update_voicing(tuning_name: str, chord_type_name: str, root_note: str, voicing: Voicing):
    if tuning_name not in db_voicings_library:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    if chord_type_name not in db_voicings_library[tuning_name] or root_note not in db_voicings_library[tuning_name][chord_type_name]:
        raise HTTPException(status_code=404, detail="Chord definition not found.")
    
    voicings_list = db_voicings_library[tuning_name][chord_type_name][root_note].voicings
    for i, v in enumerate(voicings_list):
        if v.name == voicing.name:
            voicings_list[i] = voicing
            break
    else:
        voicings_list.append(voicing)
        
    save_voicings_library()
    return {"message": f"Voicing for '{root_note} {chord_type_name}' in tuning '{tuning_name}' saved."}

@app.delete("/voicings/{tuning_name}/{chord_type_name}/{root_note}/{voicing_name:path}", status_code=200)
async def delete_voicing(tuning_name: str, chord_type_name: str, root_note: str, voicing_name: str):
    if tuning_name not in db_voicings_library or chord_type_name not in db_voicings_library[tuning_name] or root_note not in db_voicings_library[tuning_name][chord_type_name]:
        raise HTTPException(status_code=404, detail="Chord definition not found.")
        
    voicings_list = db_voicings_library[tuning_name][chord_type_name][root_note].voicings
    original_count = len(voicings_list)
    db_voicings_library[tuning_name][chord_type_name][root_note].voicings = [v for v in voicings_list if v.name != voicing_name]
    
    if len(db_voicings_library[tuning_name][chord_type_name][root_note].voicings) == original_count:
        raise HTTPException(status_code=404, detail="Voicing not found.")
        
    save_voicings_library()
    return {"message": "Voicing deleted."}

@app.get("/fretboard/visualize-scale", response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_scale(tuning_name: str, root_note: str, scale_name: str, num_frets: int = 24):
    scale = db_scales.get(scale_name)
    if not scale: raise HTTPException(status_code=404, detail="Scale not found")
    
    scale_notes = get_notes_from_intervals(root_note, scale.intervals)
    scale_note_to_interval_map = {note: i for note, i in zip(scale_notes, scale.intervals)}
    
    tuning = db_tunings.get(tuning_name)
    if not tuning: raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")

    fretboard: Dict[int, List[FretboardNote]] = {}
    for i, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % 12]
            interval = scale_note_to_interval_map.get(current_note)
            string_notes.append(FretboardNote(
                note=current_note, 
                is_in_scale=(current_note in scale_notes), 
                is_root=(current_note == root_note.upper()), 
                is_in_chord=False,
                interval_degree=interval
            ))
        fretboard[len(tuning.notes) - i] = string_notes
    return fretboard

@app.get("/fretboard/visualize-chord", response_model=Dict[int, List[FretboardNote]])
async def get_visualized_fretboard_for_chord(tuning_name: str, root_note: str, chord_type_name: str, num_frets: int = 24):
    chord_type = db_chord_types.get(chord_type_name)
    if not chord_type:
        raise HTTPException(status_code=404, detail="Chord type not found")

    tuning = db_tunings.get(tuning_name)
    if not tuning:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")

    chord_notes = get_notes_from_intervals(root_note, chord_type.intervals)
    chord_note_to_interval_map = {note: i for note, i in zip(chord_notes, chord_type.intervals)}

    fretboard: Dict[int, List[FretboardNote]] = {}
    for i, open_note in enumerate(tuning.notes):
        string_notes: List[FretboardNote] = []
        start_index = NOTES.index(open_note.upper())
        for fret in range(num_frets + 1):
            current_note = NOTES[(start_index + fret) % 12]
            interval = chord_note_to_interval_map.get(current_note)
            string_notes.append(FretboardNote(
                note=current_note,
                is_in_scale=False,
                is_root=(current_note == root_note.upper()),
                is_in_chord=(current_note in chord_notes),
                interval_degree=interval
            ))
        fretboard[len(tuning.notes) - i] = string_notes
    return fretboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FretStudioBackend:app", host="127.0.0.1", port=8000, reload=True)
