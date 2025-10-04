#!/usr/bin/env python3
"""
Build script for FretStudio Desktop Application
"""
import os
import subprocess
import shutil
import sys
from pathlib import Path

def build_frontend():
    """Build the React frontend"""
    print("🔨 Building React frontend...")
    
    # Change to frontend directory
    frontend_dir = Path("../FretStudioFrontend")
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        return False
    
    os.chdir(frontend_dir)
    
    # Install dependencies and build
    try:
        subprocess.run(["npm", "install"], check=True)
        subprocess.run(["npm", "run", "build"], check=True)
        print("✅ Frontend build completed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend build failed: {e}")
        return False
    finally:
        os.chdir("../FretStudioBackend")

def setup_static_files():
    """Copy built frontend files to backend static directory"""
    print("📁 Setting up static files...")
    
    frontend_dist = Path("../FretStudioFrontend/dist")
    static_dir = Path("static")
    
    # Remove existing static directory
    if static_dir.exists():
        shutil.rmtree(static_dir)
    
    # Copy dist folder to static
    if frontend_dist.exists():
        shutil.copytree(frontend_dist, static_dir)
        print("✅ Static files copied!")
        return True
    else:
        print("❌ Frontend dist directory not found!")
        return False

def install_requirements():
    """Install Python requirements"""
    print("📦 Installing Python requirements...")
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✅ Requirements installed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Requirements installation failed: {e}")
        return False

def main():
    """Main build process"""
    print("🚀 Building FretStudio Desktop Application...")
    
    if not build_frontend():
        print("❌ Build failed at frontend step")
        return
    
    if not setup_static_files():
        print("❌ Build failed at static files step")
        return
    
    if not install_requirements():
        print("❌ Build failed at requirements step")
        return
    
    print("\n✅ Desktop application build completed!")
    print("🎸 Run 'python desktop_app.py' to start FretStudio Desktop")

if __name__ == "__main__":
    main()