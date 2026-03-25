import pdfplumber
import os
import re
import json

base_dir = r"d:\antigravity project\香气阈值小程序"
pdfs = ["PART 1-空气.pdf", "PART 2 -水.pdf", "PART 3 -其他介质.pdf"]

# Pattern: reference starts with UPPERCASE AUTHOR, possibly with initials, followed by (YEAR)
# e.g. "AMOORE, J.E. (1986a),"
# e.g. "ZWAARDEMAKER, H., & K. KOMURO (1921),"
ref_start_pattern = re.compile(
    r'^([A-Z][A-ZÀ-Ž\-\']+(?:,?\s+[A-Z]\.?(?:\-?[A-Z]\.?)*)?'  # First author + initials
    r'(?:(?:,\s*(?:[A-Z]\.?(?:\-?[A-Z]\.?)*\s+)?[A-Z][A-ZÀ-Ž\-\']+(?:,?\s+[A-Z]\.?(?:\-?[A-Z]\.?)*)?)*)?'  # Additional authors
    r'(?:\s*[&\&]\s*(?:[A-Z]\.?(?:\-?[A-Z]\.?)*\s+)?[A-Z][A-ZÀ-Ž\-\']+(?:,?\s+[A-Z]\.?(?:\-?[A-Z]\.?)*)?)?'  # & author
    r'\s*\(\d{4}[a-z]?\))',  # (year)
    re.UNICODE
)

all_refs = {}

for pdf_name in pdfs:
    pdf_path = os.path.join(base_dir, pdf_name)
    print(f"Processing {pdf_name}...")
    
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        in_references = False
        
        # Collect all reference text, column by column
        all_lines = []
        
        for i in range(max(0, total_pages - 40), total_pages):
            page = pdf.pages[i]
            
            # Check if we're in references section
            full_text = page.extract_text() or ""
            if "REFERENCES" in full_text.upper() and not in_references:
                if len(full_text.split('\n')) > 5:
                    in_references = True
                    print(f"  Found REFERENCES on page {i+1}")
            
            if not in_references:
                continue
            
            # Extract left and right columns separately
            w0, h0, w1, h1 = page.bbox
            mid = (w0 + w1) / 2
            
            for crop_box in [(w0, h0, mid, h1), (mid, h0, w1, h1)]:
                cropped = page.crop(crop_box)
                text = cropped.extract_text()
                if not text:
                    continue
                for line in text.split('\n'):
                    stripped = line.strip()
                    if stripped:
                        all_lines.append(stripped)
        
        # Now parse the collected lines into individual references
        current_ref_lines = []
        
        for line in all_lines:
            # Skip header lines
            if "REFERENCES" in line.upper() and len(line) < 30:
                continue
            if "references" == line.lower().strip():
                continue
            if re.match(r'^\d+$', line):
                continue
            if "COMPILATIONS OF ODOUR" in line.upper():
                continue
                
            # Check if this line starts a new reference
            if ref_start_pattern.match(line):
                # Save previous reference
                if current_ref_lines:
                    full_ref = ' '.join(current_ref_lines)
                    full_ref = re.sub(r'\s+', ' ', full_ref).strip()
                    # Extract the key (everything up to and including the year)
                    year_match = re.search(r'\(\d{4}[a-z]?\)', full_ref)
                    if year_match:
                        key = full_ref[:year_match.end()].strip()
                        all_refs[key] = full_ref
                
                current_ref_lines = [line]
            else:
                # Continuation of current reference
                if current_ref_lines:
                    current_ref_lines.append(line)
        
        # Don't forget the last reference
        if current_ref_lines:
            full_ref = ' '.join(current_ref_lines)
            full_ref = re.sub(r'\s+', ' ', full_ref).strip()
            year_match = re.search(r'\(\d{4}[a-z]?\)', full_ref)
            if year_match:
                key = full_ref[:year_match.end()].strip()
                all_refs[key] = full_ref

print(f"\nExtracted {len(all_refs)} unique references.")

# Quick quality check: count how many refs have suspiciously long values (>300 chars)
long_refs = sum(1 for v in all_refs.values() if len(v) > 300)
print(f"References > 300 chars (possibly polluted): {long_refs}")

# Sample some keys
keys = list(all_refs.keys())
print(f"\nFirst 10 keys:")
for k in keys[:10]:
    print(f"  {k}")
print(f"\nLast 10 keys:")
for k in keys[-10:]:
    print(f"  {k}")

# Check specific missing authors
check_authors = ['NAUS', 'COMETTO', 'WALKER', 'KORNEEV', 'DRAVNIEKS', 'HOMANS']
print(f"\nChecking specific authors:")
for author in check_authors:
    matches = [k for k in keys if author in k.upper()]
    print(f"  {author}: {len(matches)} keys -> {matches[:5]}")

output_path = os.path.join(base_dir, "references.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(all_refs, f, ensure_ascii=False, indent=2)

print(f"\nSaved to {output_path}")
