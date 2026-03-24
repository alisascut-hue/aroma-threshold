import pdfplumber
import re

pdf_path = r"d:\antigravity project\香气阈值小程序\香气阈值手册.pdf"
print("Scanning for PART markers...")

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        text_simple = page.extract_text()
        if not text_simple:
            continue
            
        simple_upper = text_simple.upper()
        if "PART I" in simple_upper or "WATER" in simple_upper or "PART II" in simple_upper:
            # Found a relevant page! Let's check the layout version
            text_layout = page.extract_text(layout=True)
            if text_layout:
                for line in text_layout.split('\n')[:15]:  # Just first 15 lines where header would be
                    if "PART" in line.upper() or "WATER" in line.upper() or "AIR" in line.upper():
                        print(f"Page {i}: {repr(line)}")
                        clean_line = re.sub(r'\s+', '', line.upper())
                        print(f"Cleaned space-free: {clean_line}")
