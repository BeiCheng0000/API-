import sys
file_path = r"E:/wk/wk_python/api_automation_platform/web_app.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"Line 1320: {repr(lines[1319][:40])}")
print(f"Line 1344: {repr(lines[1343][:40])}")
