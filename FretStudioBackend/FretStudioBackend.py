from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Optional, Set
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

class ReorderVoicingRequest(BaseModel):
    tuning_name: str
    chord_type_name: str
    root_note: str
    voicing_name: str
    direction: str

class AllDataResponse(BaseModel):
    scales: List[Scale]
    chord_types: List[ChordType]
    tunings: List[Tuning]
    voicings_library: Dict[str, Dict[str, Dict[str, ChordVoicings]]]

class SaveRequest(BaseModel):
    scales: List[str]
    chordTypes: List[str]
    tunings: List[str]
    voicings: List[str]

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

# --- Save/Load Endpoints ---
@app.get("/save-load/all-data", response_model=AllDataResponse)
async def get_all_data_for_save_load():
    return AllDataResponse(
        scales=list(db_scales.values()),
        chord_types=list(db_chord_types.values()),
        tunings=list(db_tunings.values()),
        voicings_library=db_voicings_library
    )

@app.post("/save-load/generate-file", response_model=AllDataResponse)
async def generate_save_file(req: SaveRequest):
    selected_scales = [s for name, s in db_scales.items() if name in req.scales]
    selected_chord_types = [ct for name, ct in db_chord_types.items() if name in req.chordTypes]
    selected_tunings = [t for name, t in db_tunings.items() if name in req.tunings]
    selected_voicings_library = {}
    voicings_set = set(req.voicings)
    for tuning_name, tuning_content in db_voicings_library.items():
        if tuning_name not in req.tunings: continue
        selected_voicings_library[tuning_name] = {}
        for chord_type_name, chord_content in tuning_content.items():
            if chord_type_name not in req.chordTypes: continue
            selected_voicings_library[tuning_name][chord_type_name] = {}
            for root_note, root_content in chord_content.items():
                filtered_voicings = [v for v in root_content.voicings if f"{tuning_name}::{chord_type_name}::{v.name}" in voicings_set]
                if filtered_voicings:
                    selected_voicings_library[tuning_name][chord_type_name][root_note] = ChordVoicings(name=root_content.name, voicings=filtered_voicings)
    return AllDataResponse(scales=selected_scales, chord_types=selected_chord_types, tunings=selected_tunings, voicings_library=selected_voicings_library)

async def process_uploaded_file(file: UploadFile):
    content = await file.read()
    try:
        data = json.loads(content)
        return AllDataResponse(**data)
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=400, detail="Invalid or corrupt file format.")

@app.post("/save-load/hard-load", status_code=200)
async def hard_load_data(file: UploadFile = File(...)):
    global db_scales, db_chord_types, db_tunings, db_voicings_library
    loaded_data = await process_uploaded_file(file)
    
    db_scales = {s.name: s for s in loaded_data.scales}
    db_chord_types = {ct.name: ct for ct in loaded_data.chord_types}
    db_tunings = {t.name: t for t in loaded_data.tunings}
    db_voicings_library = {t_name: {c_name: {n: ChordVoicings(**vs.dict()) for n, vs in n_dict.items()} for c_name, n_dict in c_dict.items()} for t_name, c_dict in loaded_data.voicings_library.items()}

    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    write_json_data("tunings.json", {name: t.dict(exclude={'name'}) for name, t in db_tunings.items()})
    save_voicings_library()
    
    return {"message": "Hard load successful. All data has been replaced."}

@app.post("/save-load/soft-load", status_code=200)
async def soft_load_data(file: UploadFile = File(...)):
    global db_scales, db_chord_types, db_tunings, db_voicings_library
    loaded_data = await process_uploaded_file(file)

    for scale in loaded_data.scales:
        if scale.name not in db_scales: db_scales[scale.name] = scale
    
    for ct in loaded_data.chord_types:
        if ct.name not in db_chord_types: db_chord_types[ct.name] = ct

    for tuning in loaded_data.tunings:
        if tuning.name not in db_tunings: db_tunings[tuning.name] = tuning

    for t_name, t_data in loaded_data.voicings_library.items():
        if t_name not in db_voicings_library: db_voicings_library[t_name] = {}
        for c_name, c_data in t_data.items():
            if c_name not in db_voicings_library[t_name]: db_voicings_library[t_name][c_name] = {}
            for r_name, r_data in c_data.items():
                voicings_list = r_data.voicings
                if r_name not in db_voicings_library[t_name][c_name]:
                    db_voicings_library[t_name][c_name][r_name] = ChordVoicings(name=r_data.name, voicings=[])
                
                existing_voicing_names = {v.name for v in db_voicings_library[t_name][c_name][r_name].voicings}
                for voicing in voicings_list:
                    if voicing.name not in existing_voicing_names:
                        db_voicings_library[t_name][c_name][r_name].voicings.append(voicing)

    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})
    write_json_data("tunings.json", {name: t.dict(exclude={'name'}) for name, t in db_tunings.items()})
    save_voicings_library()

    return {"message": "Soft load successful. New data has been merged."}

# --- Other API Endpoints ---
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

@app.get("/scales", response_model=List[Scale])
async def get_all_scales(): return list(db_scales.values())

@app.post("/scales", status_code=201)
async def add_or_update_scale(scale: Scale):
    # When updating an existing scale, its `allowed_chord_types` are sent from the frontend.
    # The incoming `scale` object now contains all the necessary, updated information.
    # We can simply overwrite the old scale data with the new data.
    db_scales[scale.name] = scale
    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})
    return {"message": f"Scale '{scale.name}' saved."}

@app.delete("/scales/{scale_name}", status_code=200)
async def delete_scale(scale_name: str):
    if scale_name not in db_scales: 
        raise HTTPException(status_code=404, detail="Scale not found.")
    
    del db_scales[scale_name]
    
    # Persist the deletion to the JSON file
    write_json_data("scales.json", {k: v.dict() for k, v in db_scales.items()})
    
    return {"message": f"Scale '{scale_name}' deleted."}

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
                    diatonic_chords.append(full_chord_name)
            except (ValueError, IndexError):
                continue
                
    return diatonic_chords

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

@app.post("/chord-types/reorder", status_code=200)
async def reorder_chord_type(req: ReorderRequest):
    global db_chord_types, db_voicings_library

    if req.name not in db_chord_types:
        raise HTTPException(status_code=404, detail="Chord type to reorder not found.")

    types_list = list(db_chord_types.items())
    try:
        idx = [t[0] for t in types_list].index(req.name)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chord type name mismatch in list.")

    if req.direction == "up":
        if idx == 0: return {"message": "Chord type is already at the top."}
        types_list.insert(idx - 1, types_list.pop(idx))
    elif req.direction == "down":
        if idx == len(types_list) - 1: return {"message": "Chord type is already at the bottom."}
        types_list.insert(idx + 1, types_list.pop(idx))
    else:
        raise HTTPException(status_code=400, detail="Invalid direction.")

    new_db_chord_types = {name: data for name, data in types_list}
    db_chord_types = new_db_chord_types
    write_json_data("chord_types.json", {k: v.dict() for k, v in db_chord_types.items()})

    new_ordered_type_names = list(new_db_chord_types.keys())
    new_voicings_library = {}
    for tuning_name, tuning_data in db_voicings_library.items():
        new_tuning_data = {}
        for type_name in new_ordered_type_names:
            if type_name in tuning_data:
                new_tuning_data[type_name] = tuning_data[type_name]
        new_voicings_library[tuning_name] = new_tuning_data
    
    db_voicings_library = new_voicings_library
    save_voicings_library()

    return {"message": f"Chord type '{req.name}' moved {req.direction}."}

@app.get("/notes/{root_note}/{chord_type_name}", response_model=List[str])
async def get_chord_notes_for_editor(root_note: str, chord_type_name: str):
    chord_type = db_chord_types.get(chord_type_name)
    if not chord_type: raise HTTPException(status_code=404, detail="Chord type not found")
    return get_notes_from_intervals(root_note, chord_type.intervals)

@app.get("/voicings/{tuning_name}/{chord_type_name}/{root_note}", response_model=List[Voicing])
async def get_voicings_for_chord(tuning_name: str, chord_type_name: str, root_note: str):
    voicings_def = db_voicings_library.get(tuning_name, {}).get(chord_type_name, {}).get(root_note)
    return voicings_def.voicings if voicings_def else []

@app.post("/voicings/{tuning_name}/{chord_type_name}/{root_note}/{voicing_name:path}", status_code=201)
async def add_or_update_voicing(tuning_name: str, chord_type_name: str, root_note: str, voicing_name: str, voicing: Voicing):
    if tuning_name not in db_voicings_library:
        raise HTTPException(status_code=404, detail=f"Tuning '{tuning_name}' not found.")
    if chord_type_name not in db_voicings_library[tuning_name] or root_note not in db_voicings_library[tuning_name][chord_type_name]:
        raise HTTPException(status_code=404, detail="Chord definition not found.")
    
    # Ensure the name in the URL matches the name in the body
    if voicing_name != voicing.name:
        raise HTTPException(status_code=400, detail="Voicing name in URL does not match name in body.")

    voicings_list = db_voicings_library[tuning_name][chord_type_name][root_note].voicings
    
    # Find existing voicing by name to update it, otherwise append
    found = False
    for i, v in enumerate(voicings_list):
        if v.name == voicing.name:
            voicings_list[i] = voicing
            found = True
            break
    if not found:
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

@app.post("/voicings/reorder", status_code=200)
async def reorder_voicing(req: ReorderVoicingRequest):
    global db_voicings_library
    
    try:
        voicings_list = db_voicings_library[req.tuning_name][req.chord_type_name][req.root_note].voicings
    except KeyError:
        raise HTTPException(status_code=404, detail="Voicing path not found.")

    try:
        idx = [v.name for v in voicings_list].index(req.voicing_name)
    except ValueError:
        raise HTTPException(status_code=404, detail="Voicing not found in list.")

    if req.direction == "up":
        if idx == 0: return {"message": "Voicing is already at the top."}
        voicings_list.insert(idx - 1, voicings_list.pop(idx))
    elif req.direction == "down":
        if idx == len(voicings_list) - 1: return {"message": "Voicing is already at the bottom."}
        voicings_list.insert(idx + 1, voicings_list.pop(idx))
    else:
        raise HTTPException(status_code=400, detail="Invalid direction.")

    save_voicings_library()
    return {"message": f"Voicing '{req.voicing_name}' moved {req.direction}."}

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
