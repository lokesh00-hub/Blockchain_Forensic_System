import os
from pathlib import Path

# Base Directory of Project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Safely load .env if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

class Config:
    BASE_DIR = BASE_DIR
    SECRET_KEY = os.getenv("SECRET_KEY", "cyber_forensic_chain_custody_super_secret_key_2025")
    
    # SQLite Database Location
    DB_PATH = BASE_DIR / "storage" / "forensic_system.db"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Authentication
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt_forensic_signing_secret_98444127")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 Hours
    
    # Evidence Vault (Private Storage outside public web root)
    UPLOAD_FOLDER = BASE_DIR / "storage" / "evidence_vault"
    MONITORING_DIR = BASE_DIR / "storage" / "monitored_targets"
    REPORTS_DIR = BASE_DIR / "storage" / "reports_vault"
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 104857600))  # 100 MB max
    
    # Blockchain RPC & Smart Contract Settings
    BLOCKCHAIN_RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
    CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
    BLOCKCHAIN_PRIVATE_KEY = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")

    @classmethod
    def ensure_directories(cls):
        """Ensure all required private storage folders exist"""
        cls.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
        cls.MONITORING_DIR.mkdir(parents=True, exist_ok=True)
        cls.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
