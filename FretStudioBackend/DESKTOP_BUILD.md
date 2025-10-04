# FretStudio Desktop Build Instructions

## Prerequisites
- Python 3.8+ with tkinter support
- Node.js 16+
- npm

## Build Process

1. **Install Python dependencies:**

```bash
cd FretStudioBackend pip install -r requirements.txt
```

2. **Build the desktop application:**

```bash
python build_desktop.py
```

3. **Run the desktop application:**

```bash
python desktop_app.py
```


## Features

### Desktop-Specific Features
- **Native File Dialogs**: Save and load operations use native OS file dialogs
- **Standalone Application**: No need for separate browser
- **Offline Capability**: Runs completely offline once built

### File Operations
- **Save**: Opens native save dialog allowing user to choose location and filename
- **Load**: Opens native file dialog for selecting backup files
- **Persistent Data**: All data stored locally in JSON files

## Packaging for Distribution

To create a standalone executable:

1. **Install PyInstaller:**
```bash
pip install pyinstaller pyinstaller --onefile --windowed --add-data "static;static" desktop_app.py
```

The executable will be created in the `dist` folder.