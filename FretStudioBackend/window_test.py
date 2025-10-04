import sys
print("1. Starting...", flush=True)

try:
    print("2. Importing webview...", flush=True)
    import webview
    print("3. Creating window...", flush=True)
    window = webview.create_window('Hello', html='<h1>Hello World</h1>')
    print("4. Starting webview...", flush=True)
    webview.start()
    print("5. Done!", flush=True)
except Exception as e:
    print(f"Error: {e}", flush=True)
    input("Press Enter to exit...")