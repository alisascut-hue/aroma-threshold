import pdfplumber
import os

base_dir = r"d:\antigravity project\香气阈值小程序"
pdfs = ["PART 1-空气.pdf", "PART 2 -水.pdf", "PART 3 -其他介质.pdf"]

# We will dump all lines and find APPELL
lines = []
for name in pdfs:
    pdf_path = os.path.join(base_dir, name)
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(max(0, len(pdf.pages) - 40), len(pdf.pages)):
            page = pdf.pages[i]
            w0, h0, w1, h1 = page.bbox
            mid = (w0 + w1) / 2
            
            left = page.crop((w0, h0, mid, h1))
            right = page.crop((mid, h0, w1, h1))
            
            for cropped in [left, right]:
                text = cropped.extract_text()
                if text:
                    for line in text.split('\n'):
                        line = line.strip()
                        if line:
                            lines.append(line)

print("=== SEARCHING FOR APPELL ===")
for i, line in enumerate(lines):
    if "APPELL" in line:
        start = max(0, i-2)
        end = min(len(lines), i+15)
        for j in range(start, end):
            print(f"{j}: {lines[j]}")
        break

print("\n=== SEARCHING FOR ARENA ===")
for i, line in enumerate(lines):
    if "ARENA" in line:
        start = max(0, i-2)
        end = min(len(lines), i+15)
        for j in range(start, end):
            print(f"{j}: {lines[j]}")
        break
