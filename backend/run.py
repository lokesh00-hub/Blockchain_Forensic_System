import sys
import os
from pathlib import Path
import webbrowser
import threading
import time

# Ensure backend directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app import create_app
from app.models.user import db, User
from app.models.case import Investigation
from app.models.evidence import Evidence
from app.models.monitoring import MonitoredFile
from app.models.alert import Alert
from app.models.custody import BlockchainTransaction, ChainOfCustody

app = create_app()

def seed_database():
    with app.app_context():
        db.create_all()
        if User.query.first():
            return  # Already seeded

        # Seed Users
        inv = User(
            name="Mr. Narra Lokesh Vardhan",
            email="lokesh.vardhan@forensics.gov",
            role="Investigator",
            badge="Senior Digital Forensic Analyst",
            phone_number="+91 98480 22338",
            phone_verified=True,
            email_verified=True
        )
        inv.set_password("CyberForensics2025!")
        db.session.add(inv)

        admin = User(
            name="Chief Admin Vance",
            email="admin@forensics.gov",
            role="Administrator",
            badge="Forensic System Administrator",
            phone_number="+1 555 019 2834",
            phone_verified=True,
            email_verified=True
        )
        admin.set_password("CyberForensics2025!")
        db.session.add(admin)

        db.session.commit()
        print("[+] Forensic Database initialized with clean system tables and user accounts.")

def open_browser():
    """Wait for server to start and automatically open the application in default browser"""
    time.sleep(1.2)
    print("[*] Launching Forensic Dashboard in browser: http://127.0.0.1:5000")
    webbrowser.open("http://127.0.0.1:5000")

if __name__ == '__main__':
    seed_database()
    
    # Auto-open browser in background thread
    threading.Thread(target=open_browser, daemon=True).start()

    print("\n" + "="*70)
    print("  BLOCKCHAIN FORENSIC SYSTEM - CYBER FORENSICS PLATFORM")
    print("  Unified Web & Backend Server Online at http://127.0.0.1:5000")
    print("="*70 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
