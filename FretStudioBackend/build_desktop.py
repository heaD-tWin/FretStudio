#!/usr/bin/env python3
"""
Build script for FretStudio Desktop Application
"""
import subprocess
import sys
from pathlib import Path

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
    
    if not install_requirements():
        print("❌ Build failed at requirements step")
        return
    
    print("\n✅ Desktop application build completed!")
    print("🎸 Run 'python desktop_app.py' to start FretStudio Desktop")

if __name__ == "__main__":
    main()