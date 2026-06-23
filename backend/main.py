import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any

# Import your existing modules
from processor import DSEExtractor
from pdf_generator import PaperGenerator

app = FastAPI(title="DSE Architect API")

# Enable CORS so your React dev server can securely talk to the FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your React domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp storage for processing files
TEMP_DIR = "temp_files"
os.makedirs(TEMP_DIR, exist_ok=True)

# In-memory storage for active compilation tasks
task_store: Dict[str, Dict[str, Any]] = {}

class LayoutBlueprint(BaseModel):
    project_id: str
    pages: List[Dict[str, Any]]

@app.post("/api/extract")
async def extract_pdf_segments(
    question_pdf: UploadFile = File(...),
    answer_pdf: UploadFile = File(...)
):
    """
    Step 1: Uploads Question & Answer PDFs, processes them using the 
    geometric extractor, and returns base64 image slice arrays.
    """
    q_path = os.path.join(TEMP_DIR, f"q_{question_pdf.filename}")
    a_path = os.path.join(TEMP_DIR, f"a_{answer_pdf.filename}")
    
    # Save uploaded binary streams to temp disk files
    try:
        with open(q_path, "wb") as q_buffer:
            shutil.copyfileobj(question_pdf.file, q_buffer)
        with open(a_path, "wb") as a_buffer:
            shutil.copyfileobj(answer_pdf.file, a_buffer)
            
        # Run your hierarchy-aware processor
        extractor = DSEExtractor()
        extracted_data = extractor.process_units(q_path, a_path)
        
        return {
            "status": "success",
            "questions": extracted_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
    finally:
        # Clean up files on temp disk to preserve memory
        if os.path.exists(q_path): os.remove(q_path)
        if os.path.exists(a_path): os.remove(a_path)

@app.post("/api/compile")
async def compile_blueprint(blueprint: LayoutBlueprint):
    """
    Step 2: Receives the layout arrangement JSON payload from React, 
    compiles it to strict A4 millimeter HTML templates, and converts it to PDF.
    """
    try:
        generator = PaperGenerator()
        
        # Parse incoming Pydantic schema to match Jinja2 expected loops
        blueprint_data = blueprint.dict()
        blueprint_pages = blueprint_data["pages"]
        
        # Render HTML markup strings using your pdf_generator classes
        q_paper_html = generator.generate_question_paper(blueprint_pages)
        a_paper_html = generator.generate_answer_key(blueprint_pages)
        
        # Output paths
        q_pdf_path = os.path.join(TEMP_DIR, f"Question_Paper_{blueprint.project_id}.pdf")
        a_pdf_path = os.path.join(TEMP_DIR, f"Answer_Key_{blueprint.project_id}.pdf")
        
        # Convert HTML structures to physical PDFs.
        # WeasyPrint is highly recommended for processing print-safe millimeter layouts:
        from weasyprint import HTML
        HTML(string=q_paper_html).write_pdf(q_pdf_path)
        HTML(string=a_paper_html).write_pdf(a_pdf_path)
        
        # For simplicity in this demo, we return the generated Question PDF file
        if os.path.exists(q_pdf_path):
            return FileResponse(
                q_pdf_path, 
                media_type="application/pdf", 
                filename=f"Question_Paper_{blueprint.project_id}.pdf"
            )
        else:
            raise HTTPException(status_code=500, detail="Generated file missing from temp container.")
            
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="Conversion library 'weasyprint' missing. Install it on your system."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Compilation failed: {str(e)}")
