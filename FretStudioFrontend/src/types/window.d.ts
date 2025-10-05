// Type definitions for extending the Window interface in FretStudio Frontend

export interface FretStudioWindow extends Window {
  pywebview?: {
    api?: any;
  };
}

declare global {
  interface Window extends FretStudioWindow {}
}