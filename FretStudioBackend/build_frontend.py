import subprocess
import sys
from pathlib import Path
import os
import shutil
import time

def run_command(command, cwd=None):
    """Run a command and show output in real-time"""
    print(f"\nExecuting: {command} in {cwd}", flush=True)
    
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=cwd,
        env=os.environ.copy()
    )
    
    while True:
        output = process.stdout.readline()
        error = process.stderr.readline()
        
        if output:
            print(output.strip(), flush=True)
        if error:
            print(f"Error: {error.strip()}", flush=True)
            
        if output == '' and error == '' and process.poll() is not None:
            break
    
    return process.poll() == 0

def safe_remove_directory(path):
    """Safely remove a directory and its contents with retries"""
    max_attempts = 3
    attempt = 0
    
    while attempt < max_attempts:
        try:
            if path.exists():
                print(f"Attempting to remove {path} (attempt {attempt + 1})")
                # First try to change any readonly attributes
                for item in path.rglob("*"):
                    try:
                        os.chmod(item, 0o777)
                    except:
                        pass
                
                # Remove directory
                shutil.rmtree(path, ignore_errors=True)
            
            # Verify removal
            if not path.exists():
                return True
                
        except Exception as e:
            print(f"Warning: Failed to remove directory on attempt {attempt + 1}: {e}")
        
        # Wait before retry
        attempt += 1
        if attempt < max_attempts:
            print(f"Waiting before retry...")
            time.sleep(1)
    
    return False

def safe_copy_directory(src, dst):
    """Safely copy directory contents with retries"""
    max_attempts = 3
    attempt = 0
    
    while attempt < max_attempts:
        try:
            # Ensure destination exists
            dst.mkdir(parents=True, exist_ok=True)
            
            # Copy files
            for item in src.iterdir():
                if item.is_file():
                    shutil.copy2(item, dst)
                else:
                    shutil.copytree(item, dst / item.name, dirs_exist_ok=True)
            return True
            
        except Exception as e:
            print(f"Warning: Failed to copy directory on attempt {attempt + 1}: {e}")
            
        attempt += 1
        if attempt < max_attempts:
            print(f"Waiting before retry...")
            time.sleep(1)
    
    return False

def main():
    # Get directories
    backend_dir = Path(__file__).parent.absolute()
    frontend_dir = backend_dir.parent / "FretStudioFrontend"
    static_dir = backend_dir / "static"
    
    # Print debug info
    print("=== Build Environment ===")
    print(f"Current directory: {Path.cwd()}")
    print(f"Backend directory: {backend_dir}")
    print(f"Frontend directory: {frontend_dir}")
    print(f"Static directory: {static_dir}")
    
    # Verify directories
    if not frontend_dir.exists():
        print(f"Error: Frontend directory not found at {frontend_dir}")
        return False
        
    if not (frontend_dir / "package.json").exists():
        print("Error: package.json not found in frontend directory")
        return False
    
    # Check npm
    print("\n=== Checking npm ===")
    if not run_command("npm --version"):
        print("Error: npm not found. Please install Node.js")
        return False
    
    # Install dependencies
    print("\n=== Installing Dependencies ===")
    if not run_command("npm install", frontend_dir):
        print("Error: npm install failed")
        return False
    
    # Build frontend
    print("\n=== Building Frontend ===")
    if not run_command("npm run build", frontend_dir):
        print("Error: npm build failed")
        return False
    
    # Handle static directory
    print("\n=== Copying Build Files ===")
    dist_dir = frontend_dir / "dist"
    if not dist_dir.exists():
        print(f"Error: Build directory not found at {dist_dir}")
        return False
    
    # Clean static directory
    print(f"Cleaning {static_dir}")
    if not safe_remove_directory(static_dir):
        print("Warning: Could not fully clean static directory")
    
    # Copy build files
    print(f"Copying from {dist_dir} to {static_dir}")
    if not safe_copy_directory(dist_dir, static_dir):
        print("Error: Failed to copy build files")
        return False
    
    # Verify copy
    print("\n=== Build Complete ===")
    if static_dir.exists():
        print("Static directory contents:")
        for item in static_dir.iterdir():
            print(f"  - {item.name}")
    else:
        print("Error: Static directory does not exist after copy")
        return False
    
    return True

if __name__ == "__main__":
    try:
        # Try to close any handles that might be keeping files locked
        import gc
        gc.collect()
        
        success = main()
        if not success:
            print("\nBuild failed!")
            sys.exit(1)
        print("\nBuild successful!")
    except Exception as e:
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)