const API_BASE_URL = "http://127.0.0.1:8000";

// Define the types based on the Python backend's Pydantic models
export interface FretboardNote {
    note: string;
    is_in_scale: boolean;
    is_root: boolean;
    is_in_chord?: boolean;
    finger?: number;
}

export type FretboardAPIResponse = {
    [stringNum: string]: FretboardNote[];
};

// UPDATED: Type for a single fingering/voicing object
export interface Voicing {
    name?: string;
    difficulty?: string;
    fingering: number[][];
}

// UPDATED: Type for the chord visualization response
export interface ChordVisualizationResponse {
    fretboard: FretboardAPIResponse;
    voicings: Voicing[];
}

/**
 * Fetches the list of all available scale names from the backend.
 * @returns {Promise<string[]>} A promise that resolves to an array of scale names.
 */
export async function getScales(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/scales`, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch scales:", error);
        return []; // Return an empty array as a fallback.
    }
}

/**
 * Fetches the list of all available tuning names from the backend.
 * @returns {Promise<string[]>} A promise that resolves to an array of tuning names.
 */
export async function getTunings(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/tunings`, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch tunings:", error);
        return [];
    }
}

/**
 * Fetches the list of diatonic chords for a given scale.
 * @param root The root note of the scale.
 * @param scale The name of the scale.
 * @returns {Promise<string[]>} A promise that resolves to an array of chord names.
 */
export async function getChordsInScale(root: string, scale: string): Promise<string[]> {
    if (!root || !scale) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/scales/${root}/${scale}/chords`, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch chords in scale:", error);
        return [];
    }
}

/**
 * Fetches a visualized fretboard for a given scale.
 * @param tuning The name of the tuning (e.g., "Standard Guitar")
 * @param root The root note of the scale (e.g., "C")
 * @param scale The name of the scale (e.g., "Major")
 * @returns {Promise<FretboardAPIResponse | null>} A promise that resolves to the fretboard data.
 */
export async function getVisualizedScale(tuning: string, root: string, scale: string): Promise<FretboardAPIResponse | null> {
    if (!tuning || !root || !scale) return null;

    const params = new URLSearchParams({
        tuning_name: tuning,
        root_note: root,
        scale_name: scale,
    });

    try {
        const response = await fetch(`${API_BASE_URL}/fretboard/visualize-scale?${params}`, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch visualized scale:", error);
        return null;
    }
}

/**
 * Fetches a visualized fretboard for a given chord.
 * @param tuning The name of the tuning.
 * @param chordFullName The full name of the chord (e.g., "C Major").
 * @returns {Promise<ChordVisualizationResponse | null>} A promise that resolves the fretboard data and available voicings.
 */
export async function getVisualizedChord(
    tuning: string, 
    chordFullName: string, 
    scaleRoot: string,
    scaleName: string
): Promise<ChordVisualizationResponse | null> {
    if (!tuning || !chordFullName || !scaleRoot || !scaleName) return null;

    const [root_note, ...chord_name_parts] = chordFullName.split(' ');
    const chord_name = chord_name_parts.join(' ');

    const params = new URLSearchParams({
        tuning_name: tuning,
        root_note: root_note,
        chord_name: chord_name,
        scale_root_note: scaleRoot,
        scale_name: scaleName,
    });

    try {
        const response = await fetch(`${API_BASE_URL}/fretboard/visualize-chord?${params}`, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch visualized chord:", error);
        return null;
    }
}