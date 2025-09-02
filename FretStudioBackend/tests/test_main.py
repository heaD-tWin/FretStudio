import pytest
from fastapi.testclient import TestClient
import json
import os
import sys
import importlib

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the module itself so we can reload it
from FretStudioBackend import FretStudioBackend
# Keep the existing import for convenience, but we'll get the app from the reloaded module
from FretStudioBackend.FretStudioBackend import get_notes_from_intervals

# --- Test Setup and Fixtures ---

# The client will now be created within the fixture for each test
client = None

# Define the location of test data files
__location__ = os.path.realpath(os.path.join(os.getcwd(), os.path.dirname(__file__)))
BACKUP_DIR = os.path.join(__location__, "..", "test_backups")
SCALES_PATH = os.path.join(__location__, "..", "scales.json")
CHORD_TYPES_PATH = os.path.join(__location__, "..", "chord_types.json")
TUNINGS_PATH = os.path.join(__location__, "..", "tunings.json")
VOICINGS_PATH = os.path.join(__location__, "..", "voicings_library.json")
FACTORY_LIB_PATH = os.path.join(__location__, "..", "factory_library.json")


def backup_file(path):
    """Backs up a file if it exists."""
    if not os.path.exists(path):
        return None
    backup_path = os.path.join(BACKUP_DIR, os.path.basename(path) + ".bak")
    # Ensure we read the file content before potentially overwriting it
    try:
        with open(path, 'r') as f_read:
            content = f_read.read()
        with open(backup_path, 'w') as f_write:
            f_write.write(content)
        return backup_path
    except FileNotFoundError:
        return None


def restore_file(backup_path, original_path):
    """Restores a file from a backup."""
    if backup_path and os.path.exists(backup_path):
        with open(backup_path, 'r') as f_read, open(original_path, 'w') as f_write:
            f_write.write(f_read.read())
        os.remove(backup_path)

@pytest.fixture(scope="function", autouse=True)
def backup_and_restore_data():
    """
    Fixture to backup data, restore it after the test, and reload the app
    to ensure a clean state for every test.
    """
    global client

    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    backup_paths = {
        "scales": backup_file(SCALES_PATH),
        "chord_types": backup_file(CHORD_TYPES_PATH),
        "tunings": backup_file(TUNINGS_PATH),
        "voicings": backup_file(VOICINGS_PATH),
        "factory": backup_file(FACTORY_LIB_PATH)
    }
    
    # Create a dummy factory library for testing factory reset
    if FACTORY_LIB_PATH:
        dummy_factory_data = {
            "scales": [{"name": "Factory Major", "intervals": [1, 2, 3, 4, 5, 6, 7], "allowed_chord_types": ["Major"]}],
            "chord_types": [{"name": "Factory Major", "intervals": [1, 3, 5]}],
            "tunings": [{"name": "Factory Tuning", "notes": ["E", "A", "D", "G", "B", "E"]}],
            "voicings_library": {}
        }
        with open(FACTORY_LIB_PATH, 'w') as f:
            json.dump(dummy_factory_data, f)

    # Reload the app module to ensure it loads fresh data from the original files
    importlib.reload(FretStudioBackend)
    client = TestClient(FretStudioBackend.app)

    yield # This is where the tests will run
    
    # Teardown: Restore all original files
    restore_file(backup_paths["scales"], SCALES_PATH)
    restore_file(backup_paths["chord_types"], CHORD_TYPES_PATH)
    restore_file(backup_paths["tunings"], TUNINGS_PATH)
    restore_file(backup_paths["voicings"], VOICINGS_PATH)
    restore_file(backup_paths["factory"], FACTORY_LIB_PATH)


# --- API Integration Tests ---

def test_get_all_scales():
    """Tests that the /scales endpoint returns a list of scale objects."""
    response = client.get("/scales")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any('name' in s for s in data)

def test_get_all_chord_types():
    """Tests that the /chord-types endpoint returns a list of chord type objects."""
    response = client.get("/chord-types")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any('name' in ct for ct in data)

def test_get_chords_in_scale():
    """Tests fetching the diatonic chords for a C Major scale."""
    response = client.get("/scales/C/Major/chords")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "C Major" in data

def test_get_chord_notes_for_editor():
    """Tests fetching the notes for an A Minor chord."""
    response = client.get("/notes/A/Minor")
    assert response.status_code == 200
    assert response.json() == ["A", "C", "E"]

def test_crud_and_reorder_scale():
    """Tests creating, reordering, and deleting a scale."""
    # CREATE
    new_scale = {"name": "Test Scale", "intervals": [1, 2, 3], "allowed_chord_types": []}
    response = client.post("/scales", json=new_scale)
    assert response.status_code == 201
    
    # READ
    response = client.get("/scales")
    scales = response.json()
    assert any(s['name'] == 'Test Scale' for s in scales)
    
    # REORDER
    reorder_req = {"name": "Test Scale", "direction": "up"}
    response = client.post("/scales/reorder", json=reorder_req)
    assert response.status_code == 200

    # DELETE
    response = client.delete("/scales/Test Scale")
    assert response.status_code == 200
    response = client.get("/scales")
    scales = response.json()
    assert not any(s['name'] == 'Test Scale' for s in scales)

def test_get_visualized_fretboard_for_scale():
    """Tests the /fretboard/visualize-scale endpoint for a C Major scale."""
    params = {"tuning_name": "Standard Guitar", "scale_name": "Major", "root_note": "C"}
    response = client.get("/fretboard/visualize-scale", params=params)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    d_string = data["4"]
    g_note_on_d_string = d_string[5]
    assert g_note_on_d_string["note"] == "G"
    assert g_note_on_d_string["is_in_scale"] is True

def test_get_visualized_fretboard_invalid_tuning():
    """Tests the visualize endpoint with a non-existent tuning."""
    params = {"tuning_name": "Fake Tuning", "scale_name": "Major", "root_note": "C"}
    response = client.get("/fretboard/visualize-scale", params=params)
    assert response.status_code == 404

def test_factory_reset():
    """Tests the factory reset functionality."""
    response = client.post("/save-load/factory-reset")
    assert response.status_code == 200
    assert response.json() == {"message": "Factory library restored successfully."}
    
    # Verify that the data has been reset
    response = client.get("/scales")
    scales = response.json()
    assert any(s['name'] == 'Factory Major' for s in scales)
    assert not any(s['name'] == 'Major' for s in scales)

def test_voicing_crud_and_reorder():
    """Tests creating, reading, reordering, and deleting a voicing."""
    tuning, chord_type, root, voicing_name = "Standard Guitar", "Major", "C", "Test Voicing"
    
    # CREATE
    new_voicing = {"name": voicing_name, "difficulty": "Easy", "fingering": [[0, 1], [1, 2]]}
    response = client.post(f"/voicings/{tuning}/{chord_type}/{root}", json=new_voicing)
    assert response.status_code == 201

    # READ
    response = client.get(f"/voicings/{tuning}/{chord_type}/{root}")
    assert response.status_code == 200
    voicings = response.json()
    assert any(v['name'] == voicing_name for v in voicings)

    # REORDER
    reorder_req = {"tuning_name": tuning, "chord_type_name": chord_type, "root_note": root, "voicing_name": voicing_name, "direction": "up"}
    response = client.post("/voicings/reorder", json=reorder_req)
    assert response.status_code == 200

    # DELETE
    response = client.delete(f"/voicings/{tuning}/{chord_type}/{voicing_name}?root_note={root}")
    assert response.status_code == 200
    
    response = client.get(f"/voicings/{tuning}/{chord_type}/{root}")
    voicings = response.json()
    assert not any(v['name'] == voicing_name for v in voicings)

