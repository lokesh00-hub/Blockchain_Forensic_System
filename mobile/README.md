# Forensic Command Mobile Application
### Flutter & Dart Client for Android

The mobile application communicates with the exact same Flask backend REST API (`/api/`) used by the web interface.

---

## 📱 Features

- **Mobile Forensic Command Dashboard:** View real-time evidence integrity metrics (`Total`, `Verified`, `Tampered`, `Missing`, `Unknown`).
- **Push Alerts:** Receive instant notifications when a file tampering event is detected on-chain.
- **Evidence Verification:** Audit evidence hashes directly from mobile.
- **Forensic PDF Access:** View and export court-admissible forensic reports.

---

## 🚀 Setup & Execution

1. Ensure the Flutter SDK is installed on your workstation.
2. In the `mobile/` directory, install packages:
   ```bash
   flutter pub get
   ```
3. Connect an Android emulator or physical device via USB debugging.
4. Launch the application:
   ```bash
   flutter run
   ```
*(For Android emulator, the API endpoint is configured to `http://10.0.2.2:5000/api` to reach the local host machine).*
