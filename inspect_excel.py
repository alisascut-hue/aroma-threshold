import pandas as pd

files = [
    r"d:\antigravity project\香气阈值小程序\化合物嗅觉阈值汇编原书第2版第一部分.xlsx",
    r"d:\antigravity project\香气阈值小程序\化合物嗅觉阈值汇编原书第2版第二部分.xlsx",
    r"d:\antigravity project\香气阈值小程序\化合物嗅觉阈值汇编原书第2版第三部分.xlsx"
]

for f in files:
    try:
        df = pd.read_excel(f)
        print(f"--- {f.split('\\')[-1]} ---")
        print("Rows:", len(df))
        print("Columns:", df.columns.tolist())
        print(df.head(2).to_markdown())
        print("\n")
    except Exception as e:
        print(f"Failed to read {f}: {e}")
