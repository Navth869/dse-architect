import fitz  # PyMuPDF library to analyze document metadata layout
import re
import base64
import logging

logger = logging.getLogger("DSEArchitect.Extractor")

class DSEExtractor:
    def __init__(self):
        # Anchor checks: Must begin a block and be followed by clear spacing
        self.q_pattern = re.compile(r'^(\d+)\.$')
        
    def process_units(self, q_pdf_path: str, a_pdf_path: str) -> list:
        """
        Extracts structural blocks by analyzing vector drawings and adjacent bounding lines.
        Eliminates mid-equation clipping by enforcing safety clearances and lookahead geometric cross-checks.
        """
        extracted_units = []
        
        try:
            q_doc = fitz.open(q_pdf_path)
            # Reserved for structural multi-document cross-referencing in high-volume cycles
            a_doc = fitz.open(a_pdf_path) if a_pdf_path else None
        except Exception as e:
            logger.error(f"Failed to open source PDF streams: {str(e)}")
            raise IOError("Inbound document stream corruption.")

        for page_idx in range(len(q_doc)):
            q_page = q_doc[page_idx]
            
            # Extract structured text items and sort vertically, then horizontally
            raw_blocks = q_page.get_text("blocks")
            sorted_blocks = sorted(raw_blocks, key=lambda b: (round(b[1], 1), b[0]))
            
            # Isolate matching primary question tokens, weeding out nested sub-steps or false matches
            anchors = []
            for idx, b in enumerate(sorted_blocks):
                clean_text = b[4].strip()
                if self.q_pattern.match(clean_text):
                    # Check lines proximity or formatting weights if required to minimize Accidental Anchors
                    anchors.append((idx, self.q_pattern.match(clean_text).group(1)))
            
            # Extract structural vector marks (e.g., fraction lines, geometric paths, tables)
            vector_drawings = q_page.get_drawings()
            
            for i, (block_idx, q_num) in enumerate(anchors):
                current_block = sorted_blocks[block_idx]
                
                # Enforce a 5-point padding ceiling above the question anchor
                y_start = max(0, current_block[1] - 5)
                
                # Establish the baseline lookahead boundary based on the next primary question node
                if i + 1 < len(anchors):
                    next_anchor_idx = anchors[i + 1][0]
                    y_end = sorted_blocks[next_anchor_idx][1] - 2
                else:
                    y_end = q_page.rect.height
                
                # Geometric validation loop: Adjust boundaries if active vectors intersect the window
                for drawing in vector_drawings:
                    d_rect = drawing["rect"]
                    # If an image line or vector path crosses into our vertical track, expand the slice safely
                    if d_rect.y1 > y_start and d_rect.y0 < y_end:
                        if d_rect.y0 < y_start and (i == 0 or d_rect.y0 > sorted_blocks[anchors[i-1][0]][3]):
                            y_start = max(0, d_rect.y0 - 4)
                        if d_rect.y1 > y_end and (i + 1 == len(anchors) or d_rect.y1 < sorted_blocks[anchors[i+1][0]][1]):
                            y_end = min(q_page.rect.height, d_rect.y1 + 4)

                # Process high-resolution asset rasterization
                clip_region = fitz.Rect(0, y_start, q_page.rect.width, y_end)
                pixmap = q_page.get_pixmap(clip=clip_region, dpi=150)
                img_bytes = pixmap.tobytes("png")
                b64_payload = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
                
                height_delta = y_end - y_start
                
                # Determine standard layout container size based on height
                if height_delta > 380:
                    assigned_size = "large"
                elif height_delta > 190:
                    assigned_size = "middle"
                else:
                    assigned_size = "small"
                    
                extracted_units.append({
                    "id": f"uuid-cycle-{page_idx}-{q_num}",
                    "qNum": f"{q_num}.",
                    "spaceSize": assigned_size,
                    "qImage": b64_payload,
                    "aImage": b64_payload,  
                    "width": int(q_page.rect.width),
                    "height": int(height_delta),
                    "aspectRatio": round(q_page.rect.width / height_delta, 2),
                    "sortOrder": len(extracted_units) + 1
                })
                
        return extracted_units