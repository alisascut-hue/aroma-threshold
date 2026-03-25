import pdfplumber
import os
import re
import json

base_dir = r"d:\antigravity project\香气阈值小程序"
pdfs = ["PART 1-空气.pdf", "PART 2 -水.pdf", "PART 3 -其他介质.pdf"]

pattern_start = re.compile(r'^([A-Z][A-Z\.\,\&\s\-]+)\s*\(\d{4}[a-z]?\)')
pattern_year = re.compile(r'\((\d{4}[a-z]?)\)')

all_refs = {}

for pdf_name in pdfs:
    pdf_path = os.path.join(base_dir, pdf_name)
    print(f"Processing {pdf_name}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            in_references = False
            ref_texts = []
            
            for i in range(max(0, total_pages - 40), total_pages):
                page = pdf.pages[i]
                
                w0, h0, w1, h1 = page.bbox
                mid = (w0 + w1) / 2
                
                left = page.crop((w0, h0, mid, h1))
                right = page.crop((mid, h0, w1, h1))
                
                left_text = left.extract_text()
                right_text = right.extract_text()
                
                combined_text = ""
                if left_text:
                    combined_text += left_text + "\n"
                if right_text:
                    combined_text += right_text + "\n"
                    
                full_page_text = page.extract_text() or ""
                if "REFERENCES" in full_page_text.upper() and not in_references:
                    if len(full_page_text.split('\n')) > 5:
                        in_references = True
                        print(f"  Found REFERENCES on page {i+1}")
                
                if in_references:
                    ref_texts.append(combined_text)
            
            raw_refs = "\n".join(ref_texts)
            lines = raw_refs.split('\n')
            
            current_ref = ""
            for line in lines:
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                    
                match = pattern_start.match(line_stripped)
                if match:
                    if current_ref:
                        cleaned = re.sub(r'\s+', ' ', current_ref).strip()
                        m_year = pattern_year.search(cleaned)
                        if m_year:
                            end_idx = m_year.end()
                            key = cleaned[:end_idx].strip()
                            all_refs[key] = cleaned
                    current_ref = line_stripped
                else:
                    if current_ref:
                        current_ref += " " + line_stripped
                        
            if current_ref:
                cleaned = re.sub(r'\s+', ' ', current_ref).strip()
                m_year = pattern_year.search(cleaned)
                if m_year:
                    end_idx = m_year.end()
                    key = cleaned[:end_idx].strip()
                    all_refs[key] = cleaned
                    
    except Exception as e:
        print(f"Error reading {pdf_name}: {e}")

print(f"Extracted {len(all_refs)} unique references.")

output_path = os.path.join(base_dir, "references.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(all_refs, f, ensure_ascii=False, indent=2)

print(f"Saved to {output_path}")
