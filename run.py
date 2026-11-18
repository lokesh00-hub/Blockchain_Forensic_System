import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_path))

# Run the backend server
from run import app, seed_database, open_browser
import threading

if __name__ == '__main__':
    seed_database()
    threading.Thread(target=open_browser, daemon=True).start()
    print("\n" + "="*70)
    print("  BLOCKCHAIN FORENSIC SYSTEM - CYBER FORENSICS PLATFORM")
    print("  Unified Web & Backend Server Online at http://127.0.0.1:5000")
    print("="*70 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
