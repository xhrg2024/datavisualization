import re

files = [
    "modules/memberA/page.html",
    "modules/memberB/page.html",
    "modules/memberD/page.html",
    "modules/memberE/page.html",
]
for f in files:
    print(f"\n=== {f} ===")
    with open(f, encoding="utf-8") as fh:
        text = fh.read()
    for m in re.finditer(
        r"""data-(view|e-discipline|d-view|mc-tab)=['"]([^'"]+)['"]""", text
    ):
        print(f"  {m.group(1)} = {m.group(2)}")
