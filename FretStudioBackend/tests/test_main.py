from fastapi.testclient import TestClient
from FretStudioBackend import app, get_notes_from_intervals

# Create a client to interact with the FastAPI app
client = TestClient(app)

# --- API Integration Tests ---

def test_read_root():
    """
    Tests that the root endpoint returns a 200 OK status and the correct
    welcome message.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the FretStudio Backend!"}

def test_get_all_scale_names():
    """Tests that the /scales endpoint returns a list of scale names."""
    response = client.get("/scales")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "Major" in data
    assert "Minor Pentatonic" in data

def test_get_all_chord_names():
    """Tests that the /chords endpoint returns a list of chord names."""
    response = client.get("/chords")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "Major" in data
    assert "Diminished" in data

def test_get_c_major_scale_notes():
    """Tests fetching the notes for a C Major scale."""
    response = client.get("/scales/C/Major")
    assert response.status_code == 200
    assert response.json() == ["C", "D", "E", "F", "G", "A", "B"]

def test_get_a_minor_chord_notes():
    """Tests fetching the notes for an A Minor chord."""
    response = client.get("/chords/A/Minor")
    assert response.status_code == 200
    assert response.json() == ["A", "C", "E"]

def test_get_scale_with_invalid_name():
    """Tests that requesting a non-existent scale returns a 404 error."""
    response = client.get("/scales/C/SuperLydian")
    assert response.status_code == 404

def test_get_scale_with_invalid_root_note():
    """Tests that requesting a scale with a non-existent root note returns a 404 error."""
    response = client.get("/scales/X/Major")
    assert response.status_code == 404

def test_get_visualized_fretboard():
    """Tests the /fretboard/visualize-scale endpoint for a C Major scale."""
    params = {
        "tuning_name": "Standard Guitar",
        "scale_name": "Major",
        "root_note": "C"
    }
    # Ensure this line uses the correct endpoint
    response = client.get("/fretboard/visualize-scale", params=params)
    assert response.status_code == 200
    
    data = response.json()
    # Check that we have 6 strings
    assert len(data) == 6 
    
    # Check a specific note: 4th string (D), 5th fret should be G (in C Major)
    d_string = data["3"] # String numbers are keys, "3" is the D string
    g_note_on_d_string = d_string[5]
    assert g_note_on_d_string["note"] == "G"
    assert g_note_on_d_string["is_in_scale"] is True
    assert g_note_on_d_string["is_root"] is False
    
    # Check another note: 1st string (high E), 2nd fret should be F# (not in C Major)
    e_string = data["1"] # High E string is "1"
    f_sharp_note_on_e_string = e_string[2]
    assert f_sharp_note_on_e_string["note"] == "F#"
    assert f_sharp_note_on_e_string["is_in_scale"] is False
    assert f_sharp_note_on_e_string["is_root"] is False

def test_get_visualized_fretboard_invalid_tuning():
    """Tests the visualize endpoint with a non-existent tuning."""
    params = {
        "tuning_name": "Fake Tuning",
        "scale_name": "Major",
        "root_note": "C"
    }
    # Ensure this line uses the correct endpoint
    response = client.get("/fretboard/visualize-scale", params=params)
    assert response.status_code == 404

# --- Unit Tests for Core Logic ---

def test_c_major_scale_logic():
    """
    Unit test for the get_notes_from_intervals function with a C Major scale.
    """
    major_intervals = [2, 2, 1, 2, 2, 2, 1]
    expected_notes = ["C", "D", "E", "F", "G", "A", "B"]
    calculated_notes = get_notes_from_intervals("C", major_intervals, is_scale=True)
    assert calculated_notes == expected_notes

def test_a_minor_pentatonic_scale_logic():
    """
    Unit test for the get_notes_from_intervals function with an A Minor Pentatonic scale.
    """
    minor_penta_intervals = [3, 2, 2, 3, 2]
    expected_notes = ["A", "C", "D", "E", "G"]
    calculated_notes = get_notes_from_intervals("A", minor_penta_intervals, is_scale=True)
    assert calculated_notes == expected_notes
