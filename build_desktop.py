import os
import shutil
from pathlib import Path
import subprocess
import sys
import platform

def find_npm():
    """Find the npm executable path on Windows"""
    if platform.system() != "Windows":
        return "npm"
    
    # Common npm installation locations on Windows
    possible_paths = [
        r"C:\Program Files\nodejs\npm.cmd",
        r"C:\Program Files (x86)\nodejs\npm.cmd",
        os.path.expandvars(r"%APPDATA%\npm\npm.cmd"),
        os.path.expandvars(r"%ProgramFiles%\nodejs\npm.cmd"),
        os.path.expandvars(r"%ProgramFiles(x86)%\nodejs\npm.cmd"),
    ]
    
    # Also check PATH
    if "PATH" in os.environ:
        for path_dir in os.environ["PATH"].split(os.pathsep):
            possible_paths.append(os.path.join(path_dir, "npm.cmd"))
    
    for path in possible_paths:
        if os.path.isfile(path):
            return path
    
    return None

def check_prerequisites():
    """Check if all required tools are installed"""
    print("🔍 Checking prerequisites...")
    
    # Find npm path
    npm_path = find_npm()
    if not npm_path:
        print("❌ npm not found in common locations!")
        print("Please install Node.js from: https://nodejs.org/")
        print("Make sure it's added to your PATH environment variable.")
        return False, None
    else:
        print(f"✅ npm found at: {npm_path}")
    
    # Check Node.js and npm versions
    try:
        if platform.system() == "Windows":
            node_version = subprocess.run(["node", "--version"], 
                                       capture_output=True, text=True, 
                                       shell=True)
            npm_version = subprocess.run([npm_path, "--version"], 
                                      capture_output=True, text=True)
        else:
            node_version = subprocess.run(["node", "--version"], 
                                       capture_output=True, text=True)
            npm_version = subprocess.run(["npm", "--version"], 
                                      capture_output=True, text=True)
        
        print(f"✅ Node.js version: {node_version.stdout.strip()}")
        print(f"✅ npm version: {npm_version.stdout.strip()}")
    except Exception as e:
        print(f"❌ Error checking Node.js/npm versions: {e}")
        return False, None
    
    # Check frontend directory
    frontend_dir = Path("../FretStudioFrontend").absolute()
    print(f"\nChecking frontend directory: {frontend_dir}")
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        return False, None
    
    if not (frontend_dir / "package.json").exists():
        print("❌ package.json not found in frontend directory!")
        return False, None
    
    print("✅ Frontend directory structure looks good")
    return True, npm_path

def build_frontend(npm_path):
    """Build the React frontend"""
    frontend_dir = Path("../FretStudioFrontend").absolute()
    static_dir = Path("static")
    
    print(f"\n📁 Frontend directory: {frontend_dir}")
    print(f"📁 Static directory: {static_dir}")
    
    # Install dependencies
    print("\n📦 Installing frontend dependencies...")
    try:
        if platform.system() == "Windows":
            subprocess.run([npm_path, "install"], 
                         cwd=frontend_dir, 
                         check=True,
                         shell=True)
        else:
            subprocess.run(["npm", "install"], 
                         cwd=frontend_dir, 
                         check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ npm install failed: {e}")
        return False
    
    # Build the frontend
    print("\n🔨 Building frontend...")
    try:
        if platform.system() == "Windows":
            subprocess.run([npm_path, "run", "build"], 
                         cwd=frontend_dir, 
                         check=True,
                         shell=True)
        else:
            subprocess.run(["npm", "run", "build"], 
                         cwd=frontend_dir, 
                         check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ npm build failed: {e}")
        return False
    
    # Handle static directory
    if static_dir.exists():
        print("\n🧹 Cleaning existing static directory...")
        shutil.rmtree(static_dir)
    
    # Copy build files
    dist_dir = frontend_dir / "dist"
    if not dist_dir.exists():
        print(f"❌ Build directory not found at {dist_dir}")
        return False
    
    print("\n📋 Copying build files to static directory...")
    shutil.copytree(dist_dir, static_dir)
    
    # Handle favicon
    favicon_source = frontend_dir / "public" / "favicon.ico"
    favicon_dest = static_dir / "favicon.ico"
    
    if favicon_source.exists():
        print("📄 Copying favicon...")
        shutil.copy2(favicon_source, favicon_dest)
    else:
        print("📄 Creating default favicon...")
        with open(favicon_dest, 'wb') as f:
            f.write(b'')
    
    print("\n📁 Static directory contents:")
    for item in static_dir.iterdir():
        print(f"  - {item.name}")
    return True

def install_python_dependencies():
    """Install required Python packages"""
    print("\n📦 Installing Python dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Python dependencies: {e}")
        return False

def main():
    """Main build process"""
    print("\n🚀 Building FretStudio Desktop Application...")
    
    # Check prerequisites and get npm path
    prereqs_ok, npm_path = check_prerequisites()
    if not prereqs_ok:
        print("\n❌ Prerequisites check failed!")
        print("Please ensure Node.js is installed and in your PATH")
        print("Download from: https://nodejs.org/")
        sys.exit(1)
    
    if not build_frontend(npm_path):
        print("\n❌ Frontend build failed!")
        sys.exit(1)
    
    if not install_python_dependencies():
        print("\n❌ Python dependencies installation failed!")
        sys.exit(1)
    
    print("\n✅ Build completed successfully!")
    print("\n🎮 To start the application, run:")
    print("   python desktop_app.py")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Build process interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Build failed with error: {e}")
        print("\nStack trace:")
        import traceback
        traceback.print_exc()
        sys.exit(1)