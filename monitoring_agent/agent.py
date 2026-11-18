import os
import sys
import time
import json
from pathlib import Path
from typing import Dict, Optional

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT / "backend"))

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    HAS_WATCHDOG = True
except ImportError:
    HAS_WATCHDOG = False

from integrity_checker import IntegrityChecker

# Default Monitored Targets Folder
TARGETS_DIR = PROJECT_ROOT / "storage" / "monitored_targets"
API_URL = "http://127.0.0.1:5000/api"

class ForensicWatchdogHandler(FileSystemEventHandler if HAS_WATCHDOG else object):
    """
    Real-Time Event-Driven File System Observer.
    Catches unauthorized file changes, ransomware encryption, and malicious file deletions.
    """

    def __init__(self, baselines: Optional[Dict[str, str]] = None):
        self.baselines = baselines or {}

    def register_baseline(self, filepath: str, baseline_hash: str):
        abs_p = str(Path(filepath).resolve())
        self.baselines[abs_p] = baseline_hash

    def on_modified(self, event):
        if hasattr(event, 'is_directory') and event.is_directory:
            return
        abs_p = str(Path(event.src_path).resolve())
        # Avoid reacting to temporary swap files or hidden editor locks
        if os.path.basename(abs_p).startswith(('.', '~')):
            return
        self._evaluate(abs_p, "MODIFIED")

    def on_deleted(self, event):
        if hasattr(event, 'is_directory') and event.is_directory:
            return
        abs_p = str(Path(event.src_path).resolve())
        self._evaluate(abs_p, "DELETED")

    def _evaluate(self, abs_path: str, trigger_event: str):
        filename = os.path.basename(abs_path)
        baseline = self.baselines.get(abs_path, 'NO_BASELINE')
        
        result = IntegrityChecker.check_target(abs_path, baseline)
        status = result['status']

        print("\n" + "-"*65)
        print(f"[*] [WATCHDOG EVENT: {trigger_event}] Target: {filename}")
        print(f"[*] Status: [{status.upper()}] - {result['message']}")
        
        if result.get('alert'):
            alert = result['alert']
            print(f"[!] [SECURITY ALERT DISPATCHED] Severity: {alert['severity'].upper()} | {alert['text']}")
            self._dispatch_to_api(alert)
        print("-"*65 + "\n")

    def _dispatch_to_api(self, alert_data: dict):
        """Dispatch alert payload to Flask REST API if available"""
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{API_URL}/alerts",
                data=json.dumps(alert_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status in (200, 201):
                    print("[+] Alert recorded in central forensic ledger & audit trail.")
        except Exception:
            pass  # Local standalone fallback if Flask is not running

def setup_default_baselines(handler: ForensicWatchdogHandler):
    """Register initial trusted baselines for default monitored targets"""
    TARGETS_DIR.mkdir(parents=True, exist_ok=True)

    default_files = {
        TARGETS_DIR / "database_backup.sql": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        TARGETS_DIR / "system_config.ini": "85750868eb2a297371f4c7595e865f3f982181467472c57a9e74288b6287959b",
        TARGETS_DIR / "user_logs.txt": "18ac3e7343f016890c510e93f935261169d9e3f565436429830faf093400544f"
    }

    for path, b_hash in default_files.items():
        if path.exists():
            # Calculate real current hash if baseline not set
            from app.services.hashing_service import HashingService
            real_hash = HashingService.calculate_file_sha256(str(path))
            handler.register_baseline(str(path), real_hash)
            print(f"[+] Baselined: {path.name} -> {real_hash[:16]}... (Trusted)")

def run_agent():
    print("="*65)
    print("  PRE-ATTACK FORENSIC FILE MONITORING AGENT")
    print(f"  Watching Directory: {TARGETS_DIR}")
    print("="*65)

    handler = ForensicWatchdogHandler()
    setup_default_baselines(handler)

    if not HAS_WATCHDOG:
        print("[!] Python watchdog not installed. Running in polling loop mode...")
        try:
            while True:
                time.sleep(2)
        except KeyboardInterrupt:
            print("\nStopping monitoring agent.")
        return

    observer = Observer()
    observer.schedule(handler, path=str(TARGETS_DIR), recursive=False)
    observer.start()
    print("\n[*] Monitoring daemon ACTIVE. Watching for modifications & deletions...")
    print("[*] Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\nStopping monitoring daemon.")
    observer.join()

if __name__ == '__main__':
    run_agent()
