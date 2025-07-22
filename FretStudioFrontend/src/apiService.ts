const API_BASE_URL = "http://127.0.0.1:8000";

// --- Type Definitions ---
export interface FretboardNote {
    note: string;
    is_in_scale: boolean;
    is_root: boolean;
    is_in_chord?: boolean;
}

export type FretboardAPIResponse = {
    [stringNum: string]: FretboardNote[];
};

// UPDATED: Voicing is now a rich object
export interface Voicing {
    name?: string;
    difficulty?: string;
    fingering: number[][];
}

// UPDATED: The response for chord visualization
export interface ChordVisualizationResponse {
    fretboard: FretboardAPIResponse;
    voicings: Voicing[];
}

// --- API Functions ---

export async function getScales(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/scales`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch scales:", error);
        return [];
    }
}

export async function getTunings(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/tunings`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch tunings:", error);
        return [];
    }
}

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

export async function getVisualizedScale(tuning: string, root: string, scale: string): Promise<FretboardAPIResponse | null> {
    if (!tuning || !root || !scale) return null;
    const params = new URLSearchParams({ tuning_name: tuning, root_note: root, scale_name: scale });
    try {
        const response = await fetch(`${API_BASE_URL}/fretboard/visualize-scale?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch visualized scale:", error);
        return null;
    }
}

// UPDATED: The signature for fetching a chord is now simpler
export async function getVisualizedChord(
    tuning: string, 
    chordFullName: string, 
    scaleRoot: string,
    scaleName: string
): Promise<ChordVisualizationResponse | null> {
    if (!tuning || !chordFullName || !scaleRoot || !scaleName) return null;

    const params = new URLSearchParams({
        tuning_name: tuning,
        chord_name: chordFullName, // The full name is now the key
        scale_root_note: scaleRoot,
        scale_name: scaleName,
    });

    try {
        const response = await fetch(`${API_BASE_URL}/fretboard/visualize-chord?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch visualized chord:", error);
        return null;
    }
}