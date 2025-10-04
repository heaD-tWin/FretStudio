import sys
print("Starting application...", flush=True)

try:
    print("Importing modules...", flush=True)
    import webview
    from FretStudioBackend import app
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse, HTMLResponse
    import uvicorn
    import threading
    import os
    from pathlib import Path
    import logging
    print("All modules imported successfully", flush=True)
except Exception as e:
    print(f"Failed to import modules: {e}", flush=True)
    sys.exit(1)

# Configure logging
print("Configuring logging...", flush=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('desktop_app.log')
    ]
)
logger = logging.getLogger(__name__)

# Get absolute path to static directory
print("Checking static directory...", flush=True)
static_dir = Path(__file__).parent / "static"
print(f"Static directory: {static_dir}", flush=True)
print(f"Static directory exists: {static_dir.exists()}", flush=True)

if static_dir.exists():
    print("Static directory contents:", flush=True)
    for item in static_dir.iterdir():
        print(f"  - {item.name}", flush=True)

# Add window reference for native dialogs
window = None

# Mount static files
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

# Add native dialog endpoints
@app.get("/api/dialog/save")
async def show_save_dialog():
    if window:
        file_types = ('JSON Files (*.json)',)
        path = window.create_file_dialog(webview.SAVE_DIALOG, 
                                       directory='~',
                                       save_filename='fret_studio_save.json',
                                       file_types=file_types)
        return {"filePath": path}
    return {"filePath": None}

@app.get("/api/dialog/open")
async def show_open_dialog():
    if window:
        file_types = ('JSON Files (*.json)',)
        result = window.create_file_dialog(webview.OPEN_DIALOG, 
                                         directory='~',
                                         file_types=file_types)
        return {"filePath": result[0] if result else None}
    return {"filePath": None}

def run_server():
    """Run the FastAPI server"""
    try:
        logger.info("Starting FastAPI server...")
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    except Exception as e:
        logger.error(f"Server failed to start: {e}")
        sys.exit(1)

def create_window():
    """Create the PyWebview window"""
    global window
    try:
        logger.info("Creating PyWebview window...")
        window = webview.create_window(
            "FretStudio",
            "http://127.0.0.1:8000",
            width=1200,
            height=800,
            min_size=(800, 600)
        )
        logger.info("Window created successfully")
        return window
    except Exception as e:
        logger.error(f"Failed to create window: {e}")
        sys.exit(1)

def main():
    try:
        logger.info("Starting FretStudio Desktop Application...")
        
        # Check if static directory exists
        if not static_dir.exists():
            logger.error(f"Static directory not found at: {static_dir}")
            print(f"Error: Static directory not found at: {static_dir}")
            sys.exit(1)
        
        # Check for index.html
        if not (static_dir / "index.html").exists():
            logger.error("index.html not found in static directory")
            print("Error: index.html not found in static directory")
            sys.exit(1)
            
        # Start the server in a separate thread
        logger.info("Starting server thread...")
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        
        # Give the server a moment to start
        import time
        time.sleep(2)
        
        # Start the PyWebview window
        logger.info("Starting PyWebview...")
        webview.start(create_window)
        
    except Exception as e:
        logger.error(f"Application failed to start: {e}")
        print(f"Error: Application failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Application terminated by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)