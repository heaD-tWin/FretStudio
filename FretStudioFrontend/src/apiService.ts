const API_BASE_URL = "http://127.0.0.1:8000";

// --- Type Definitions ---
export interface FretboardNote { note: string; is_in_scale: boolean; is_root: boolean; is_in_chord?: boolean; }
export type FretboardAPIResponse = { [stringNum: string]: FretboardNote[]; };
export interface Voicing { name: string; difficulty: string; fingering: number[][]; }
export interface ChordVisualizationResponse { fretboard: FretboardAPIResponse; voicings: Voicing[]; }
export interface ChordType { name: string; intervals: number[]; }
export interface Scale { name: string; intervals: number[]; allowed_chord_types: string[]; }

// --- API Functions ---

// --- Scale Functions ---
export async function getScales(): Promise<Scale[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/scales`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch scales:", error);
        return [];
    }
}

export async function addScale(scale: Scale): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/scales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scale),
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to add scale:", error);
        return false;
    }
}

export async function deleteScale(scaleName: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/scales/${encodeURIComponent(scaleName)}`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to delete scale:", error);
        return false;
    }
}

export async function getChordsInScale(root: string, scale: string): Promise<string[]> {
    if (!root || !scale) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/scales/${encodeURIComponent(root)}/${encodeURIComponent(scale)}/chords`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch chords in scale:", error);
        return [];
    }
}

// --- Chord Type Functions ---
export async function getChordTypes(): Promise<ChordType[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/chord-types`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch chord types:", error);
        return [];
    }
}

export async function addChordType(chordType: ChordType): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/chord-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chordType),
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to add chord type:", error);
        return false;
    }
}

export async function deleteChordType(typeName: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/chord-types/${encodeURIComponent(typeName)}`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to delete chord type:", error);
        return false;
    }
}

// --- Voicing and Fretboard Functions ---
export async function getChordNotesForEditor(rootNote: string, chordTypeName: string): Promise<string[]> {
    if (!rootNote || !chordTypeName) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${encodeURIComponent(rootNote)}/${encodeURIComponent(chordTypeName)}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch chord notes:", error);
        return [];
    }
}

export async function getVoicingsForChord(chordTypeName: string, rootNote: string): Promise<Voicing[]> {
    if (!chordTypeName || !rootNote) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/voicings/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch voicings for chord:", error);
        return [];
    }
}

export async function addVoicingToChord(chordTypeName: string, rootNote: string, voicing: Voicing): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/voicings/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(voicing),
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to add voicing:", error);
        return false;
    }
}

export async function deleteVoicing(chordTypeName: string, rootNote: string, voicingName: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/voicings/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}/${encodeURIComponent(voicingName)}`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch (error) {
        console.error("Failed to delete voicing:", error);
        return false;
    }
}

export async function getVisualizedChord(chordTypeName: string, rootNote: string, scaleRoot: string, scaleName: string): Promise<ChordVisualizationResponse | null> {
    if (!chordTypeName || !rootNote || !scaleRoot || !scaleName) return null;
    const params = new URLSearchParams({ scale_root_note: scaleRoot, scale_name: scaleName });
    try {
        const response = await fetch(`${API_BASE_URL}/visualize-chord/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch visualized chord:", error);
        return null;
    }
}

export async function getVisualizedChordSimple(chordTypeName: string, rootNote: string): Promise<ChordVisualizationResponse | null> {
    if (!chordTypeName || !rootNote) return null;
    try {
        const response = await fetch(`${API_BASE_URL}/visualize-chord-simple/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch simple visualized chord:", error);
        return null;
    }
}

export async function getTunings(): Promise<string[]> { try { const r = await fetch(`${API_BASE_URL}/tunings`); return r.ok ? await r.json() : []; } catch (_e) { console.error("Failed to fetch tunings:", _e); return []; } }
export async function getVisualizedScale(tuning: string, root: string, scale: string): Promise<FretboardAPIResponse | null> { if (!tuning || !root || !scale) return null; const p = new URLSearchParams({ tuning_name: tuning, root_note: root, scale_name: scale }); try { const r = await fetch(`${API_BASE_URL}/fretboard/visualize-scale?${p}`); return r.ok ? await r.json() : null; } catch (_e) { console.error("Failed to fetch visualized scale:", _e); return null; } }