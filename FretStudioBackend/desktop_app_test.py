import sys
import os
import threading
import time

# Force unbuffered output
os.environ['PYTHONUNBUFFERED'] = '1'

def debug_print(msg):
    """Force print to console and flush"""
    print(msg, flush=True)
    sys.stdout.flush()

debug_print("1. Script starting...")

try:
    debug_print("2. Importing modules...")
    import webview
    import uvicorn
    from fastapi import FastAPI
    
    debug_print("3. Creating FastAPI app...")
    app = FastAPI()
    
    @app.get("/")
    def read_root():
        return {"Hello": "World"}
    
    debug_print("4. Setting up server...")
    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    
    debug_print("5. Starting server in thread...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Give the server a moment to start
    debug_print("6. Waiting for server to start...")
    time.sleep(2)
    
    debug_print("7. Creating window...")
    # Create the window first
    window = webview.create_window(
        'Test Window',
        'http://127.0.0.1:8000',
        width=800,
        height=600
    )
    
    debug_print("8. Starting application...")
    # Start webview with no arguments
    webview.start()
    
except Exception as e:
    debug_print(f"ERROR: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    debug_print("Press Enter to exit...")
    input()
    sys.exit(1)