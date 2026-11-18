import os
from pathlib import Path
from flask import Flask, send_from_directory
from flask_cors import CORS
from .config import Config
from .models.user import db

def create_app(config_class=Config):
    # Determine frontend static folder
    frontend_dir = Config.BASE_DIR / 'frontend'
    
    app = Flask(
        __name__,
        static_folder=str(frontend_dir),
        static_url_path=''
    )
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]}})
    db.init_app(app)

    # Ensure required private storage folders exist
    Config.ensure_directories()

    # Register Blueprints
    from .routes.auth_routes import auth_bp
    from .routes.dashboard_routes import dashboard_bp
    from .routes.evidence_routes import evidence_bp
    from .routes.verification_routes import verification_bp
    from .routes.monitoring_routes import monitoring_bp
    from .routes.case_routes import case_bp
    from .routes.alert_routes import alert_bp
    from .routes.report_routes import report_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(evidence_bp, url_prefix='/api/evidence')
    app.register_blueprint(verification_bp, url_prefix='/api/evidence')
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    app.register_blueprint(case_bp, url_prefix='/api/investigations')
    app.register_blueprint(alert_bp, url_prefix='/api/alerts')
    app.register_blueprint(report_bp, url_prefix='/api/reports')

    # Security Headers Hook (Cybersecurity Hardening)
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    # Serve Frontend Single Page App / Static HTML
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'dashboard.html')

    @app.route('/<path:path>')
    def serve_static(path):
        if (Path(app.static_folder) / path).exists():
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'dashboard.html')

    return app
