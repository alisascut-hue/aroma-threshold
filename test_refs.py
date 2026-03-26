import pdfplumber
import os
import re

base_dir = r"d:\antigravity project\香气阈值小程序"
pdf_path = os.path.join(base_dir, "PART 1-空气.pdf")

with pdfplumber.open(pdf_path) as pdf:
    total_pages = len(pdf.pages)
    print(f"Total pages: {total_pages}")
    # References are usually at the end. Let's read the last 30 pages and look for "REFERENCES"
    in_references = False
    ref_text = []
    for i in range(max(0, total_pages - 30), total_pages):
        page = pdf.pages[i]
        text = page.extract_text(layout=True)
        if not text:
            text = page.extract_text()
        if not text:
            continue
            
        if "REFERENCES" in text.upper():
            in_references = True
            print(f"Found REFERENCES on page {i}")
            
        if in_references:
            ref_text.append(text)

raw_refs = "\n".join(ref_text)
lines = raw_refs.split('\n')

# Find starts of references
ref_starts = []
pattern = re.compile(r'^([A-Z][A-Z\.\,\&\s\-]+)\s*\(\d{4}[a-z]?\)')
for line in lines:
    line = line.strip()
    match = pattern.match(line)
    if match:
        ref_starts.append(line)

print(f"Found {len(ref_starts)} reference starts. Here are the first 10:")
for r in ref_starts[:10]:
    print(r)
print("\nAnd the last 10:")
for r in ref_starts[-10:]:
    print(r)
