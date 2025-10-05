const API_BASE_URL = 'http://127.0.0.1:8000';

// --- Types ---
export interface Scale {
  name: string;
  intervals: number[];
  allowed_chord_types: string[];
}

export interface ChordType {
  name: string;
  intervals: number[];
}

export interface Voicing {
  name: string;
  difficulty: string;
  fingering: [number, number, number][];
}

export interface Tuning {
  name: string;
  notes: string[];
}

export interface FretboardNote {
  note: string;
  is_in_scale: boolean;
  is_in_chord: boolean;
  interval_degree?: number;
}

export interface FretboardAPIResponse {
  [stringNumber: string]: FretboardNote[];
}

export interface VisualizedChordResponse {
  fretboard: FretboardAPIResponse;
  voicings: Voicing[];
}

export interface AllData {
  scales: Scale[];
  chord_types: ChordType[];
  tunings: Tuning[];
  voicings_library: {
    [tuningName: string]: {
      [chordTypeName: string]: {
        [rootNote: string]: {
          name: string;
          voicings: Voicing[];
        };
      };
    };
  };
}

export interface SaveSelectionsPayload {
  scales: string[];
  chordTypes: string[];
  tunings: string[];
  voicings: string[];
}

// --- Dialog Types ---
export interface DialogResponse {
  filePath: string | null;
}

// --- Helper ---
async function handleResponse<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`);
    const errorBody = await response.text();
    console.error("Error Body:", errorBody);
    return null;
  }
  try {
    // Handle cases where the response might be empty
    const text = await response.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    return null;
  }
}

// --- Web File Handling ---
export const downloadFile = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// --- Native Dialog & File System Methods ---
export const showNativeSaveDialog = async (): Promise<string | string[] | null> => {
  // Call the Python API directly. It may return a string or a tuple (which becomes an array).
  return (window as any).pywebview.api.show_save_dialog();
};

export const showNativeOpenDialog = async (): Promise<string | string[] | null> => {
  // Call the Python API directly.
  return (window as any).pywebview.api.show_open_dialog();
};

export const saveToFile = async (data: any, filePath: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/save-load/write-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath,
      content: data
    })
  });
  return response.ok;
};

// --- File System Abstraction ---
export interface FileSystemHandler {
  isNative: boolean;
  saveFile: (data: any, filename: string) => Promise<boolean>;
  loadFile: () => Promise<File | null>;
}

export const fileSystem: FileSystemHandler = {
  isNative: false, // This will be updated by initializeFileSystem
  
  saveFile: async (data: any, filename: string): Promise<boolean> => {
    if (fileSystem.isNative) {
      const filePathResult = await showNativeSaveDialog();
      if (!filePathResult) return false; // User cancelled dialog

      // Ensure the file path is a string, as pywebview can return a tuple (array).
      const filePath = Array.isArray(filePathResult) ? filePathResult[0] : filePathResult;

      if (!filePath) {
        console.error("File path is empty after processing.");
        return false;
      }

      return await saveToFile(data, filePath);
    } else {
      try {
        downloadFile(data, filename);
        return true;
      } catch (error) {
        console.error('Web save error:', error);
        return false;
      }
    }
  },

  loadFile: async (): Promise<File | null> => {
    if (fileSystem.isNative) {
      const filePathResult = await showNativeOpenDialog();
      if (!filePathResult) return null; // User cancelled dialog

      // Ensure the file path is a string.
      const filePath = Array.isArray(filePathResult) ? filePathResult[0] : filePathResult;
      
      if (!filePath) {
        console.error("File path is empty after processing.");
        return null;
      }
      
      try {
        // For native, we get a path and need to fetch the content from the backend
        const response = await fetch(`${API_BASE_URL}/api/file/read?path=${encodeURIComponent(filePath)}`);
        if (!response.ok) return null;
        const blob = await response.blob();
        const fileName = filePath.split(/[/\\]/).pop() || 'loaded.json';
        return new File([blob], fileName, { type: 'application/json' });
      } catch (error) {
        console.error('Native load error:', error);
        return null;
      }
    } else {
      // For web, the file input is handled directly by the component.
      return null;
    }
  }
};

export const initializeFileSystem = (isNative: boolean) => {
  fileSystem.isNative = isNative;
};

// --- Save/Load API ---
export const getAllDataForSaveLoad = async (): Promise<AllData | null> => {
  const response = await fetch(`${API_BASE_URL}/save-load/all-data`);
  return handleResponse<AllData>(response);
};

export const generateSaveFile = async (selections: SaveSelectionsPayload): Promise<AllData | null> => {
  const response = await fetch(`${API_BASE_URL}/save-load/generate-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selections),
  });
  return handleResponse<AllData>(response);
};

// --- Functions for Hard and Soft Load ---
// These functions work for both web (file upload) and native (file from path)
export const hardLoadFromFile = async (file: File): Promise<boolean> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/save-load/hard-load`, {
    method: 'POST',
    body: formData,
  });
  return response.ok;
};

export const softLoadFromFile = async (file: File): Promise<boolean> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/save-load/soft-load`, {
    method: 'POST',
    body: formData,
  });
  return response.ok;
};

export const factoryReset = async (): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/save-load/factory-reset`, {
    method: 'POST',
  });
  return response.ok;
};

// --- Scales API ---
export const getScales = async (): Promise<Scale[]> => {
  const response = await fetch(`${API_BASE_URL}/scales`);
  return await handleResponse<Scale[]>(response) || [];
};

export const addScale = async (scale: Scale): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/scales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scale as Scale),
  });
  return response.ok;
};

export const deleteScale = async (scaleName: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/scales/${encodeURIComponent(scaleName)}`, {
    method: 'DELETE',
  });
  return response.ok;
};

export const reorderScale = async (name: string, direction: 'up' | 'down'): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/scales/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, direction }),
  });
  return response.ok;
};

export const getChordsInScale = async (rootNote: string, scaleName: string, tuningName: string): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/scales/${encodeURIComponent(rootNote)}/${encodeURIComponent(scaleName)}/chords?tuning_name=${encodeURIComponent(tuningName)}`);
  return await handleResponse<string[]>(response) || [];
};

// --- Chord Types API ---
export const getChordTypes = async (): Promise<ChordType[]> => {
  const response = await fetch(`${API_BASE_URL}/chord-types`);
  return await handleResponse<ChordType[]>(response) || [];
};

export const addChordType = async (chordType: ChordType): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/chord-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chordType),
  });
  return response.ok;
};

export const deleteChordType = async (typeName: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/chord-types/${encodeURIComponent(typeName)}`, {
    method: 'DELETE',
  });
  return response.ok;
};

export const reorderChordType = async (name: string, direction: 'up' | 'down'): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/chord-types/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, direction }),
  });
  return response.ok;
};

// --- Tunings API ---
export const getTunings = async (): Promise<Tuning[]> => {
  const response = await fetch(`${API_BASE_URL}/tunings`);
  return await handleResponse<Tuning[]>(response) || [];
};

export const addTuning = async (tuning: Tuning): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/tunings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tuning),
  });
  return response.ok;
};

export const deleteTuning = async (tuningName: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/tunings/${encodeURIComponent(tuningName)}`, {
    method: 'DELETE',
  });
  return response.ok;
};

export const reorderTuning = async (name: string, direction: 'up' | 'down'): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/tunings/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, direction }),
  });
  return response.ok;
};

// --- Voicings API ---
export const getVoicingsForChord = async (tuningName: string, chordTypeName: string, rootNote: string): Promise<Voicing[]> => {
  const response = await fetch(`${API_BASE_URL}/voicings/${encodeURIComponent(tuningName)}/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}`);
  return await handleResponse<Voicing[]>(response) || [];
};

export const addVoicingToChord = async (tuningName: string, chordTypeName: string, rootNote: string, voicing: Voicing): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/voicings/${encodeURIComponent(tuningName)}/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(rootNote)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(voicing),
  });
  return response.ok;
};

export const deleteVoicing = async (tuningName: string, chordTypeName: string, rootNote: string, voicingName: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/voicings/${encodeURIComponent(tuningName)}/${encodeURIComponent(chordTypeName)}/${encodeURIComponent(voicingName)}?root_note=${encodeURIComponent(rootNote)}`, {
    method: 'DELETE',
  });
  return response.ok;
};

export const reorderVoicing = async (
  tuningName: string, 
  chordTypeName: string, 
  rootNote: string, 
  voicingName: string, 
  direction: 'up' | 'down'
): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/voicings/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tuning_name: tuningName, chord_type_name: chordTypeName, root_note: rootNote, voicing_name: voicingName, direction }),
  });
  return response.ok;
};

// --- Fretboard Visualization API ---
export const getVisualizedScale = async (tuningName: string, rootNote: string, scaleName: string): Promise<FretboardAPIResponse | null> => {
  const response = await fetch(`${API_BASE_URL}/fretboard/visualize-scale?tuning_name=${encodeURIComponent(tuningName)}&root_note=${encodeURIComponent(rootNote)}&scale_name=${encodeURIComponent(scaleName)}`);
  return handleResponse<FretboardAPIResponse>(response);
};

export const getVisualizedChord = async (tuningName: string, rootNote: string, chordTypeName: string): Promise<FretboardAPIResponse | null> => {
  const response = await fetch(`${API_BASE_URL}/fretboard/visualize-chord?tuning_name=${encodeURIComponent(tuningName)}&root_note=${encodeURIComponent(rootNote)}&chord_type_name=${encodeURIComponent(chordTypeName)}`);
  return handleResponse<FretboardAPIResponse>(response);
};

export const getChordNotesForEditor = async (rootNote: string, chordTypeName: string): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/notes/${encodeURIComponent(rootNote)}/${encodeURIComponent(chordTypeName)}`);
  return await handleResponse<string[]>(response) || [];
};