import json
import os

pdf_data_path = r"d:\antigravity project\香气阈值小程序\aroma_data_pdf.json"
old_excel_path = r"d:\antigravity project\香气阈值小程序\aroma_data.json"

print("Loading old excel data to map medium...")
try:
    with open(old_excel_path, 'r', encoding='utf-8') as f:
        old_data = json.load(f)

    # Map CAS to Medium
    cas_to_medium = {}
    for item in old_data:
        cas = item.get("cas")
        src = item.get("source_file", "")
        if cas:
            if "第一部分" in src:
                cas_to_medium[cas] = "空气"
            elif "第二部分" in src:
                cas_to_medium[cas] = "水"
            elif "第三部分" in src:
                cas_to_medium[cas] = "其他介质"

    print("Loading PDF data...")
    with open(pdf_data_path, 'r', encoding='utf-8') as f:
        pdf_data = json.load(f)

    updated_count = 0
    # Update medium
    for item in pdf_data:
        cas = item.get("cas")
        if cas in cas_to_medium:
            item["medium"] = cas_to_medium[cas]
            updated_count += 1
        elif item["medium"] == "Unknown":
            item["medium"] = "未知"

    print(f"Updated {updated_count} records with correct medium.")

    # Save PDF data
    with open(pdf_data_path, 'w', encoding='utf-8') as f:
        json.dump(pdf_data, f, ensure_ascii=False, indent=2)

    print("Fast medium update complete!")
except Exception as e:
    print(f"Failed: {e}")
