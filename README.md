# DSE Spatial Architect 🚀

An advanced, full-stack WYSIWYG workspace designed to automate the geometric extraction, spatial packing, and print-safe compilation of examination question booklets and marking schemes. 

Built specifically to parse structured documents (like Hong Kong DSE exam formats), handle fluid UI canvas transformations, and enforce pixel-perfect physical dimensions across headless PDF generators.

---

## 🏗️ System Architecture

The platform runs on a modern decoupled Client-Server architecture:
* **Frontend Dashboard:** React, Vite, Tailwind CSS, Lucide Icons. Features an interactive millimeter grid canvas with live First-Fit Decreasing (FFD) layout processing and real-time bounding overflow re-classification loops.
* **Backend Engine:** FastAPI, PyMuPDF (`fitz`), Jinja2, WeasyPrint. Handles multi-document coordinate normalization, lookahead vector asset grouping, and physical A4 millimeter template printing.

---

## 🛠️ Repository File Structure

```text
dse-architect/
│
├── backend/
│   ├── main.py              # FastAPI application (API Glue Layer)
│   ├── processor.py         # Hierarchy-Aware PDF Geometric Extractor
│   ├── pdf_generator.py     # Legacy block-style HTML/CSS Template Compiler
│   └── requirements.txt     # Python backend dependencies
│
└── frontend/                # UI Workspace Client
    ├── src/
    │   ├── App.jsx          # WYSIWYG Workspace Dashboard
    │   ├── main.jsx         # App Entry Point
    │   └── index.css        # Tailwind Core Directives
    ├── package.json         # Node Ecosystem Manifest
    ├── vite.config.js       # Vite Engine Configurations
    ├── tailwind.config.js   # Style Build Configurations
    └── postcss.config.js    # Pre-processor Bridge Configurations


⚡ Local Setup & Execution Guide
To operate this application locally, you must run both runtime servers concurrently in separate terminal panels.

1. Backend Service Setup (Python)
Navigate to the backend directory, construct a clean execution sandbox, and install dependencies:

Bash
cd backend
python -m venv venv

# Activation for Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Activation for Mac/Linux:
source venv/bin/activate

# Install Core Engine Packages
python -m pip install -r requirements.txt
Start the local Uvicorn development server:

Bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
The API engine is active at http://127.0.0.1:8000. Interactive documentation is available at /docs.

2. Frontend Dashboard Setup (Node.js)
Open a new terminal session, navigate to the frontend folder, install dependencies, and spin up Vite:

Bash
cd frontend

# Run script bypass for Windows machines if execution policies block local node script launches
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Install and start client
npm install
npm run dev
The workspace interface will become active at http://localhost:5173.

💡 Technical Implementation Highlights
Epsilon Boundary Correction: Employs an exact tolerance calculation limit (currentSum + neededHeight <= 1.01) inside the UI layout hook to neutralize floating-point roundoff errors and eliminate browser lockup loop states.

Print-Safe Layout Fallbacks: Abandons unstable headless flex configurations in favor of standard traditional block centering rules with explicit millimeter presets (width: 210mm; height: 297mm;) to guarantee proportional rendering across headless engines like WeasyPrint.

Coordinate Synchronization: Matches page indices and lookahead clipping regions between disparate Question and Answer document inputs dynamically.

