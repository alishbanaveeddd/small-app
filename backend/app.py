import os
import re
import sqlite3
import json
import mimetypes
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from email.parser import BytesParser
from email.policy import default as email_policy

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
DB_PATH = os.path.join(BASE_DIR, 'assets.db')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def sanitize_filename(filename):
    name = os.path.basename(filename)
    return re.sub(r'[^A-Za-z0-9._-]', '_', name)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id TEXT NOT NULL,
            category TEXT NOT NULL,
            image_path TEXT,
            timestamp TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


def row_to_asset(row):
    return {
        'id': row[0],
        'asset_id': row[1],
        'category': row[2],
        'image_url': f'/uploads/{os.path.basename(row[3])}' if row[3] else None,
        'timestamp': row[4]
    }


def parse_multipart(headers, body):
    """Parse multipart/form-data using Python's standard-library email parser."""
    content_type = headers.get('Content-Type', '')
    raw = f'Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n'.encode('utf-8') + body
    msg = BytesParser(policy=email_policy).parsebytes(raw)
    fields = {}
    files = {}
    if msg.is_multipart():
        for part in msg.iter_parts():
            name = part.get_param('name', header='Content-Disposition')
            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b''
            if filename:
                files[name] = (filename, payload)
            elif name:
                fields[name] = payload.decode('utf-8', errors='replace')
    return fields, files


class AssetHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/assets':
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('SELECT id, asset_id, category, image_path, timestamp FROM assets ORDER BY id DESC')
            rows = c.fetchall()
            conn.close()
            self._set_headers(200)
            self.wfile.write(json.dumps([row_to_asset(r) for r in rows]).encode())

        elif path == '/api/search':
            query = parse_qs(parsed.query).get('q', [''])[0]
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute(
                'SELECT id, asset_id, category, image_path, timestamp FROM assets WHERE asset_id LIKE ? ORDER BY id DESC',
                (f'%{query}%',)
            )
            rows = c.fetchall()
            conn.close()
            self._set_headers(200)
            self.wfile.write(json.dumps([row_to_asset(r) for r in rows]).encode())

        elif re.match(r'^/api/assets/\d+$', path):
            record_id = int(path.rsplit('/', 1)[1])
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('SELECT id, asset_id, category, image_path, timestamp FROM assets WHERE id = ?', (record_id,))
            row = c.fetchone()
            conn.close()
            if row:
                self._set_headers(200)
                self.wfile.write(json.dumps(row_to_asset(row)).encode())
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({'error': 'Asset not found'}).encode())

        elif path.startswith('/uploads/'):
            filename = os.path.basename(path)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                mime_type, _ = mimetypes.guess_type(file_path)
                self._set_headers(200, mime_type or 'application/octet-stream')
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({'error': 'File not found'}).encode())

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())

    def do_POST(self):
        if self.path != '/api/assets':
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
            return

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        content_type = self.headers.get('Content-Type', '')

        asset_id = None
        category = None
        image_path = None

        if 'multipart/form-data' in content_type:
            fields, files = parse_multipart(self.headers, body)
            asset_id = (fields.get('asset_id') or '').strip()
            category = (fields.get('category') or '').strip()
            if 'image' in files:
                orig_name, file_bytes = files['image']
                if orig_name and file_bytes and allowed_file(orig_name):
                    ts_prefix = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')
                    safe_name = f'{ts_prefix}_{sanitize_filename(orig_name)}'
                    file_path = os.path.join(UPLOAD_FOLDER, safe_name)
                    with open(file_path, 'wb') as f:
                        f.write(file_bytes)
                    image_path = file_path
        elif 'application/json' in content_type:
            try:
                data = json.loads(body)
            except Exception:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
                return
            asset_id = (data.get('asset_id') or '').strip()
            category = (data.get('category') or '').strip()
        else:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'Unsupported Content-Type'}).encode())
            return

        if not asset_id or not category:
            self._set_headers(400)
            self.wfile.write(json.dumps({'error': 'Asset ID and Category are required'}).encode())
            return

        timestamp = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            'INSERT INTO assets (asset_id, category, image_path, timestamp) VALUES (?, ?, ?, ?)',
            (asset_id, category, image_path, timestamp)
        )
        new_id = c.lastrowid
        conn.commit()
        conn.close()

        self._set_headers(201)
        self.wfile.write(json.dumps({
            'message': 'Asset added',
            'id': new_id,
            'timestamp': timestamp
        }).encode())


if __name__ == '__main__':
    init_db()
    server_address = ('0.0.0.0', 5000)
    httpd = HTTPServer(server_address, AssetHandler)
    print('ZeeLinks Backend running on http://0.0.0.0:5000', flush=True)
    httpd.serve_forever()
