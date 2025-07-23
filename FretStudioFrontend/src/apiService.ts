const API_BASE_URL = "http://127.0.0.1:8000";

// --- Type Definitions ---
export interface FretboardNote { note: string; is_in_scale: boolean; is_root: boolean; is_in_chord?: boolean; }
export type FretboardAPIResponse = { [stringNum: string]: FretboardNote[]; };
export interface Voicing { name: string; difficulty: string; fingering: number[][]; }
export interface ChordVisualizationResponse { fretboard: FretboardAPIResponse; voicings: Voicing[]; }
export interface ChordType { name: string; intervals: number[]; }

// --- API Functions ---

export async function getChordTypes(): Promise<string[]> {
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

export async function getChordNotesForEditor(rootNote: string, chordTypeName: string): Promise<string[]> {
    if (!rootNote || !chordTypeName) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/notes/${rootNote}/${chordTypeName}`);
        if (!response.ok) return []; // Don't log error if not found, it's expected
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch chord notes:", error);
        return [];
    }
}

export async function getAllChordNames(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/voicings`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch all chord names:", error);
        return [];
    }
}

export async function addVoicingToChord(fullChordName: string, voicing: Voicing): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/voicings/${fullChordName}`, {
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

export async function getVisualizedChord(fullChordName: string, scaleRoot: string, scaleName: string): Promise<ChordVisualizationResponse | null> {
    if (!fullChordName || !scaleRoot || !scaleName) return null;
    const params = new URLSearchParams({ scale_root_note: scaleRoot, scale_name: scaleName });
    try {
        const response = await fetch(`${API_BASE_URL}/visualize-chord/${fullChordName}?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch visualized chord:", error);
        return null;
    }
}

// CORRECTED: All catch blocks now use the underscore prefix for unused variables
export async function getScales(): Promise<string[]> { try { const r = await fetch(`${API_BASE_URL}/scales`); return r.ok ? await r.json() : []; } catch (_e) { console.error("Failed to fetch scales:", _e); return []; } }
export async function getTunings(): Promise<string[]> { try { const r = await fetch(`${API_BASE_URL}/tunings`); return r.ok ? await r.json() : []; } catch (_e) { console.error("Failed to fetch tunings:", _e); return []; } }
export async function getVisualizedScale(tuning: string, root: string, scale: string): Promise<FretboardAPIResponse | null> { if (!tuning || !root || !scale) return null; const p = new URLSearchParams({ tuning_name: tuning, root_note: root, scale_name: scale }); try { const r = await fetch(`${API_BASE_URL}/fretboard/visualize-scale?${p}`); return r.ok ? await r.json() : null; } catch (_e) { console.error("Failed to fetch visualized scale:", _e); return null; } }
export async function getChordsInScale(root: string, scale: string): Promise<string[]> {
    if (!root || !scale) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/scales/${root}/${scale}/chords`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch chords in scale:", error);
        return [];
    }
}