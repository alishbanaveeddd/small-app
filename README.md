# ZeeLinks Warehouse Asset Tracker

A responsive, on-premises warehouse asset tracking prototype built with **React.js**, a **Python REST API**, and **SQLite**. Operators can register assets with photographs, automatically record UTC timestamps, search records by Asset ID, and inspect individual entries from any desktop or mobile browser on the local network.

---

## Features Implemented

- **Asset Registration Form**: Enter **Asset ID / Identification Number**, **Asset Category** (with quick suggestions), and upload an **Asset Photograph** (with live image preview).
- **Automatic Timestamping**: Every entry is automatically stamped with the server's UTC date and time (`ISO-8601`) upon creation.
- **Persistent Database Storage**: All records are stored in a local SQLite database (`backend/assets.db`), and uploaded images are saved on disk under `backend/uploads/`.
- **Live Dashboard & Search**: Displays all saved records with summary metrics, category badges, and search filtering by Asset ID.
- **Individual Record Inspection**: Clicking any asset card opens a detail modal fetching `GET /api/assets/<id>` to show full metadata and the full-size photograph.
- **Responsive Design**: Works on desktop workstations and mobile phones over the warehouse LAN.
- **Automation-Ready API**: `POST /api/assets` accepts both `multipart/form-data` (for manual operator uploads) and `application/json` (for automated barcode/RFID/IoT integrations).

---

## Architecture & Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React.js 18 (`react-scripts`, `axios`) | Component-based, responsive UI with dev proxy to the backend |
| **Backend** | Python 3 Standard Library (`http.server`, `sqlite3`, `email.parser`) | Zero external pip dependencies — runs out-of-the-box on any warehouse PC with Python 3 installed |
| **Database** | SQLite (`backend/assets.db`) | Lightweight, file-based ACID database requiring zero server setup |
| **File Storage** | Local filesystem (`backend/uploads/`) | Fast on-premises image storage served via `GET /uploads/<filename>` |

### Designed for Future Automation
The backend decouples data ingestion from the UI:
- **Current (Manual)**: Operators submit `multipart/form-data` from the React dashboard.
- **Future (Automated)**: Barcode scanners, RFID readers, conveyor cameras, or an ERP/WMS service can `POST` directly to `/api/assets` with `Content-Type: application/json`:
  ```json
  {
    "asset_id": "ZL-AUTO-9001",
    "category": "Pallet"
  }
  ```
  No database or frontend schema changes are required for automated ingestion.

---

## Project Structure

```text
zee_links/
├── backend/
│   ├── app.py              # REST API server + SQLite integration + image storage
│   ├── assets.db           # SQLite database (auto-created on first run)
│   ├── requirements.txt    # Optional Flask reference dependencies
│   └── uploads/            # Uploaded asset photographs (auto-created)
├── frontend/
│   ├── .env                # Enables LAN host access for mobile devices
│   ├── package.json        # React dependencies & API proxy (http://localhost:5000)
│   ├── public/
│   │   └── index.html      # HTML entry point with mobile viewport
│   └── src/
│       ├── index.js        # React root mount
│       ├── App.js          # Dashboard, form, search, and detail modal
│       └── App.css         # Responsive styling
├── run.bat                 # One-click Windows launcher for backend & frontend
└── README.md
```

---

## Database Schema

Table: `assets` in `backend/assets.db`

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique internal record ID |
| `asset_id` | `TEXT NOT NULL` | Operator or system-generated Asset ID |
| `category` | `TEXT NOT NULL` | Asset category (e.g., Forklift, Pallet) |
| `image_path` | `TEXT` | Server path to uploaded photograph (nullable) |
| `timestamp` | `TEXT NOT NULL` | UTC ISO-8601 creation timestamp |

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/assets` | List all saved asset records (newest first) |
| `GET` | `/api/assets/<id>` | Retrieve a single asset record by database ID |
| `GET` | `/api/search?q=<asset_id>` | Search records by partial or full Asset ID |
| `POST` | `/api/assets` | Create a new asset (`multipart/form-data` or `application/json`) |
| `GET` | `/uploads/<filename>` | Serve an uploaded asset photograph |

---

## How to Run

### Prerequisites
- **Python 3.10+** (verified on Python 3.14)
- **Node.js 18+** and **npm**

### Option 1: One-Click Launch (Windows)
1. Install frontend dependencies once (if `frontend/node_modules` is not already present):
   ```powershell
   cd frontend
   npm install
   ```
2. Double-click **`run.bat`** in the project root (or run `.\run.bat` in PowerShell).
   - Starts the Python backend on `http://0.0.0.0:5000`
   - Starts the React frontend on `http://localhost:3000`

### Option 2: Manual Launch (Two Terminals)
**Terminal 1 — Backend:**
```powershell
cd backend
python app.py
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm install   # first time only
npm start
```

### Accessing from a Mobile Phone on the Warehouse Network
1. Find the warehouse PC's local IP address (`ipconfig` on Windows, e.g., `192.168.1.50`).
2. Ensure Windows Firewall allows inbound connections on port `3000` (and `5000` if accessing the API directly).
3. On your mobile phone (connected to the same Wi-Fi/LAN), open:
   ```text
   http://<warehouse-pc-ip>:3000
   ```
   The React dev server proxies `/api/*` and `/uploads/*` requests to the backend automatically.

---

## Screenshots & Demo Checklist
When submitting, include captures of:
1. **Desktop Dashboard** — Asset registration form, stats header, and saved asset cards.
2. **Record Detail Modal** — Clicking an asset card to view its full photograph and timestamp.
3. **Search Filter** — Filtering records by Asset ID.
4. **Mobile View** — Responsive layout accessed from a phone browser.
