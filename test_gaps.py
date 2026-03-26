import pdfplumber
import os

base_dir = r"d:\antigravity project\香气阈值小程序"
pdf_path = os.path.join(base_dir, "PART 1-空气.pdf")

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[173]
    w0, h0, w1, h1 = page.bbox
    mid = (w0 + w1) / 2
    left = page.crop((w0, h0, mid, h1))
    
    # Get lines by looking at character bounding boxes
    chars = left.chars
    lines = []
    current_line = []
    current_y0 = -1
    
    # Sort chars top to bottom, left to right
    sorted_chars = sorted(chars, key=lambda c: (round(c['top']), c['x0']))
    
    for c in sorted_chars:
        # If new line (y coordinate differs by more than 2)
        if current_y0 == -1 or abs(c['top'] - current_y0) > 4:
            if current_line:
                lines.append(current_line)
            current_line = [c]
            current_y0 = c['top']
        else:
            current_line.append(c)
    
    if current_line:
        lines.append(current_line)
        
    print("=== MEASURING LINE GAPS ===")
    for i in range(1, min(20, len(lines))):
        prev_line = lines[i-1]
        curr_line = lines[i]
        
        prev_bottom = max(c['bottom'] for c in prev_line)
        curr_top = min(c['top'] for c in curr_line)
        gap = curr_top - prev_bottom
        
        text = "".join(c['text'] for c in curr_line)
        print(f"Line {i}: Gap={gap:.2f} | Text: {text}")

