import sys
from datetime import datetime

def write_test():
    print("1. Script starting...", flush=True)
    
    try:
        # Try basic file write
        print("2. Attempting to write test file...", flush=True)
        with open("basic_test.txt", "w") as f:
            f.write(f"Test write at {datetime.now()}")
        
        print("3. Basic file write successful", flush=True)
        
        # Try reading the file back
        print("4. Reading file back...", flush=True)
        with open("basic_test.txt", "r") as f:
            content = f.read()
        
        print("5. File contents:", flush=True)
        print(content, flush=True)
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}", flush=True)
        print("Exception details:", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=== Starting Basic File Test ===", flush=True)
    write_test()
    print("=== Test Complete ===", flush=True)
    # Keep console open
    input("Press Enter to exit...")