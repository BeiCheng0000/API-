import re

with open("templates/index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines, 1):
    opens = len(re.findall(r"<div[\s>]", line))
    closes = len(re.findall(r"</div>", line))

    for _ in range(opens):
        stack.append(i)
    for _ in range(closes):
        if stack:
            opened_at = stack.pop()
        else:
            print(f"Extra close at line {i}")

print(f"Remaining open divs: {len(stack)}")
for line_num in stack:
    print(f"  Unclosed div opened at line {line_num}: {lines[line_num-1].strip()[:80]}")
