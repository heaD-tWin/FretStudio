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

class Api:
    """
    API class exposed to JavaScript. Methods here are called directly
    from the frontend and execute in the main GUI thread.
    """
    def show_save_dialog(self):
        """
        Shows a native save file dialog. This method gets the active
        window dynamically, avoiding circular references.
        """
        window = webview.active_window()
        if not window:
            logger.error("Save dialog called but no active window found.")
            return None
        
        return window.create_file_dialog(
            webview.SAVE_DIALOG,
            directory=os.path.expanduser('~'),
            save_filename='fretstudio_save.json',
            file_types=('JSON Files (*.json)', 'All files (*.*)')
        )

    def show_open_dialog(self):
        """
        Shows a native open file dialog.
        """
        window = webview.active_window()
        if not window:
            logger.error("Open dialog called but no active window found.")
            return None

        file_paths = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=('JSON Files (*.json)', 'All files (*.*)')
        )
        return file_paths[0] if file_paths else None

# Global API instance for the webview
js_api = Api()

def init_app():
    """Initialize the application"""
    logger.info("Initializing application...")
    static_dir = Path(__file__).parent / "static"
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
    return app, static_dir

def run_server(app_instance):
    """Run the FastAPI server"""
    logger.info("Starting FastAPI server...")
    uvicorn.run(app_instance, host="127.0.0.1", port=8000, log_level="info")

def create_window():
    """Create the application window"""
    logger.info("Creating window...")
    return webview.create_window(
        "FretStudio",
        "http://127.0.0.1:8000",
        width=1200,
        height=800,
        min_size=(800, 600),
        js_api=js_api
    )

def main():
    try:
        app_instance, static_dir = init_app()
        
        if not static_dir.exists() or not (static_dir / "index.html").exists():
            logger.error(f"Static directory or index.html not found at: {static_dir}")
            return False

        server_thread = threading.Thread(target=run_server, args=(app_instance,), daemon=True)
        server_thread.start()
        time.sleep(3)

        create_window()
        logger.info("Starting application...")
        webview.start(debug=True)
        
        return True

    except Exception as e:
        logger.error(f"Application failed to start: {str(e)}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)