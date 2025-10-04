import sys
import os
import threading
import time
from pathlib import Path
import logging
import traceback
import webview
import uvicorn
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from FretStudioBackend import app

# Force unbuffered output
os.environ['PYTHONUNBUFFERED'] = '1'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('desktop_app.log')
    ]
)
logger = logging.getLogger(__name__)

def init_app():
    """Initialize the application"""
    logger.info("Initializing application...")
    
    # Get absolute path to static directory
    static_dir = Path(__file__).parent / "static"
    logger.info(f"Static directory: {static_dir}")
    logger.info(f"Static directory exists: {static_dir.exists()}")

    logger.info("=== Static Directory Contents ===")
    if static_dir.exists():
        for path in static_dir.rglob("*"):
            if path.is_file():
                logger.info(f"File: {path.relative_to(static_dir)}")
            else:
                logger.info(f"Dir:  {path.relative_to(static_dir)}")

    # Mount static files
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

    return app, static_dir

def run_server(app):
    """Run the FastAPI server"""
    logger.info("Starting FastAPI server...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

def create_window():
    """Create the application window"""
    logger.info("Creating window...")
    window = webview.create_window(
        "FretStudio",
        "http://127.0.0.1:8000",
        width=1200,
        height=800,
        min_size=(800, 600)
    )
    return window

def main():
    try:
        # Initialize application
        app, static_dir = init_app()
        
        # Add window reference for native dialogs
        window = None
        
        # Add native dialog endpoints
        @app.get("/api/dialog/save")
        async def show_save_dialog():
            if window:
                file_types = ('JSON Files (*.json)',)
                path = window.create_file_dialog(
                    webview.SAVE_DIALOG,
                    directory='~',
                    save_filename='fret_studio_save.json',
                    file_types=file_types
                )
                return {"filePath": path}
            return {"filePath": None}

        @app.get("/api/dialog/open")
        async def show_open_dialog():
            if window:
                file_types = ('JSON Files (*.json)',)
                result = window.create_file_dialog(
                    webview.OPEN_DIALOG,
                    directory='~',
                    file_types=file_types
                )
                return {"filePath": result[0] if result else None}
            return {"filePath": None}

        @app.get("/debug-static")
        async def debug_static():
            files = []
            if static_dir.exists():
                for path in static_dir.rglob("*"):
                    if path.is_file():
                        files.append(str(path.relative_to(static_dir)))
            return {"files": files}

        # Verify static directory
        if not static_dir.exists():
            logger.error(f"Static directory not found at: {static_dir}")
            return False

        # Check for index.html
        if not (static_dir / "index.html").exists():
            logger.error("index.html not found in static directory")
            return False

        # Start the server in a separate thread
        logger.info("Starting server thread...")
        server_thread = threading.Thread(target=run_server, args=(app,), daemon=True)
        server_thread.start()

        # Give the server a moment to start
        logger.info("Waiting for server to start...")
        time.sleep(2)

        # Create and start the window
        window = create_window()
        logger.info("Starting application...")
        webview.start()
        
        return True

    except Exception as e:
        logger.error(f"Application failed to start: {str(e)}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            logger.error("Application failed to start")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Application terminated by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)