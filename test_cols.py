import pdfplumber
import os

base_dir = r"d:\antigravity project\香气阈值小程序"
pdf_path = os.path.join(base_dir, "PART 1-空气.pdf")

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[173]
    w0, h0, w1, h1 = page.bbox
    mid = (w0 + w1) / 2
    
    left = page.crop((w0, h0, mid, h1))
    right = page.crop((mid, h0, w1, h1))
    
    left_text = left.extract_text()
    right_text = right.extract_text()
    
    print("LEFT COLUMN:", left_text[:200])
    print("-" * 40)
    print("RIGHT COLUMN:", right_text[:200])
