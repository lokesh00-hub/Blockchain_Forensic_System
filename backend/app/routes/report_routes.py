import os
import re
from datetime import datetime
from pathlib import Path
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from ..models.case import Investigation
from ..models.evidence import Evidence
from ..services.report_service import ReportService

report_bp = Blueprint('report_bp', __name__)

ALLOWED_REPORT_EXTENSIONS = {'pdf', 'txt', 'docx', 'doc', 'json', 'csv'}

def is_allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_REPORT_EXTENSIONS

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"

@report_bp.route('', methods=['GET'])
def list_reports():
    """
    Dynamically lists all real generated and uploaded forensic reports
    stored on disk in REPORTS_DIR. Does not return fake/sample reports.
    """
    reports_vault = current_app.config['REPORTS_DIR']
    reports_vault.mkdir(parents=True, exist_ok=True)
    
    reports = []
    # Scan actual files stored on disk
    for file_path in sorted(reports_vault.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if file_path.is_file() and not file_path.name.startswith('.'):
            stat = file_path.stat()
            file_name = file_path.name
            size_str = format_file_size(stat.st_size)
            mtime_str = datetime.fromtimestamp(stat.st_mtime).strftime('%b %d, %Y')
            
            # Check if this matches a generated report pattern: Forensic_Report_<case_id>.pdf
            match = re.search(r'Forensic_Report_([A-Za-z0-9_-]+)\.pdf', file_name, re.IGNORECASE)
            if match:
                case_id = match.group(1)
                c = Investigation.query.filter_by(case_id=case_id).first()
                title = f"Forensic Investigation Report - {case_id}" if not c else f"Forensic Report: {c.title} ({case_id})"
                rep_id = f"REP-{case_id}-{datetime.fromtimestamp(stat.st_mtime).year}"
            else:
                case_id = "CUSTOM"
                title = file_name
                rep_id = f"DOC-{file_name}"

            reports.append({
                'id': rep_id,
                'filename': file_name,
                'caseId': case_id,
                'title': title,
                'date': mtime_str,
                'size': size_str,
                'downloadUrl': f"/api/reports/{file_name}/download"
            })

    return jsonify({
        'status': 'success',
        'reports': reports
    }), 200

@report_bp.route('/upload', methods=['POST'])
def upload_report():
    """
    Accepts and stores user-supplied report files directly into the reports vault.
    Allows users to provide their own external forensic report files.
    """
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file field in upload request'}), 400

    uploaded_file = request.files['file']
    if not uploaded_file or uploaded_file.filename == '':
        return jsonify({'status': 'error', 'message': 'No file selected for upload'}), 400

    if not is_allowed_file(uploaded_file.filename):
        allowed = ", ".join(ALLOWED_REPORT_EXTENSIONS)
        return jsonify({'status': 'error', 'message': f'Unsupported file type. Allowed: {allowed}'}), 400

    filename = secure_filename(uploaded_file.filename)
    if not filename:
        filename = f"Report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"

    reports_vault = current_app.config['REPORTS_DIR']
    reports_vault.mkdir(parents=True, exist_ok=True)
    destination = reports_vault / filename

    uploaded_file.save(str(destination))
    stat = destination.stat()
    size_str = format_file_size(stat.st_size)
    date_str = datetime.fromtimestamp(stat.st_mtime).strftime('%b %d, %Y')

    return jsonify({
        'status': 'success',
        'message': f'Report document "{filename}" stored successfully in reports vault',
        'report': {
            'id': f"DOC-{filename}",
            'filename': filename,
            'caseId': request.form.get('case_id', 'CUSTOM'),
            'title': request.form.get('title') or filename,
            'date': date_str,
            'size': size_str,
            'downloadUrl': f"/api/reports/{filename}/download"
        }
    }), 201

@report_bp.route('/generate', methods=['POST'])
def generate_report():
    """
    Synthesizes a formal court-defensible forensic PDF report for a specified case.
    """
    data = request.get_json() or {}
    case_id = str(data.get('case_id', '')).strip()
    include_hashes = data.get('include_hashes', True)
    include_blockchain = data.get('include_blockchain', True)

    if not case_id:
        return jsonify({'status': 'error', 'message': 'Case ID is required to generate a report'}), 400

    # Path traversal & injection defense
    if not re.match(r'^[A-Za-z0-9_-]+$', case_id):
        return jsonify({'status': 'error', 'message': 'Invalid case ID format'}), 400

    c = Investigation.query.filter_by(case_id=case_id).first()
    if not c:
        return jsonify({'status': 'error', 'message': f'Case {case_id} not found in database'}), 404

    evidence_items = Evidence.query.filter_by(case_id=case_id).all()
    evidence_dicts = [ev.to_dict() for ev in evidence_items]

    report_id = f"REP-{case_id}-{datetime.utcnow().year}"
    reports_vault = current_app.config['REPORTS_DIR']
    reports_vault.mkdir(parents=True, exist_ok=True)
    output_pdf_path = reports_vault / f"Forensic_Report_{case_id}.pdf"

    # Synthesize formal PDF document
    ReportService.generate_pdf_report(
        case=c.to_dict(),
        evidence_list=evidence_dicts,
        output_path=str(output_pdf_path),
        investigator=c.investigator_name,
        include_hashes=include_hashes,
        include_blockchain=include_blockchain
    )

    stat = output_pdf_path.stat()
    size_str = format_file_size(stat.st_size)

    return jsonify({
        'status': 'success',
        'reportId': report_id,
        'filename': f"Forensic_Report_{case_id}.pdf",
        'downloadUrl': f"/api/reports/{case_id}/download",
        'generatedAt': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        'case': c.to_dict(),
        'evidenceCount': len(evidence_items),
        'evidence': evidence_dicts,
        'size': size_str
    }), 200

@report_bp.route('/<target>/download', methods=['GET'])
def download_report(target):
    """
    Downloads a forensic report file by exact filename or by case_id.
    """
    target = str(target).strip()
    # Path traversal defense
    if not re.match(r'^[A-Za-z0-9_.-]+$', target):
        return jsonify({'status': 'error', 'message': 'Invalid file/case identifier'}), 400

    reports_vault = current_app.config['REPORTS_DIR']
    reports_vault.mkdir(parents=True, exist_ok=True)

    # 1. Exact filename match
    direct_file = reports_vault / target
    if direct_file.is_file():
        return send_file(
            str(direct_file),
            as_attachment=True,
            download_name=target
        )

    # 2. Check Forensic_Report_<case_id>.pdf
    pdf_path = reports_vault / f"Forensic_Report_{target}.pdf"
    if pdf_path.is_file():
        return send_file(
            str(pdf_path),
            as_attachment=True,
            download_name=f"Forensic_Report_{target}.pdf"
        )

    # 3. If case exists in database, generate on the fly
    c = Investigation.query.filter_by(case_id=target).first()
    if c:
        evidence_items = Evidence.query.filter_by(case_id=target).all()
        ReportService.generate_pdf_report(
            case=c.to_dict(),
            evidence_list=[ev.to_dict() for ev in evidence_items],
            output_path=str(pdf_path),
            investigator=c.investigator_name
        )
        return send_file(
            str(pdf_path),
            as_attachment=True,
            download_name=f"Forensic_Report_{target}.pdf"
        )

    return jsonify({'status': 'error', 'message': f'Report "{target}" not found'}), 404

@report_bp.route('/<target>', methods=['DELETE'])
def delete_report(target):
    """
    Deletes an existing report file from the reports vault.
    """
    target = str(target).strip()
    if not re.match(r'^[A-Za-z0-9_.-]+$', target):
        return jsonify({'status': 'error', 'message': 'Invalid report identifier'}), 400

    reports_vault = current_app.config['REPORTS_DIR']
    deleted = False

    direct_file = reports_vault / target
    if direct_file.is_file():
        direct_file.unlink()
        deleted = True

    pdf_file = reports_vault / f"Forensic_Report_{target}.pdf"
    if not deleted and pdf_file.is_file():
        pdf_file.unlink()
        deleted = True

    if deleted:
        return jsonify({
            'status': 'success',
            'message': f'Report "{target}" removed from disk successfully'
        }), 200

    return jsonify({'status': 'error', 'message': f'Report file "{target}" not found'}), 404
