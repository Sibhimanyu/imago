#!/usr/bin/env python3
"""Write the QR code for the flyer's URL as a module matrix flyer.jsx can draw.

    python3 brand/kit/scripts/qr.py https://your-imago-url   (needs: pip install qrcode)

Writes scripts/qr.json: {"url": ..., "size": n, "rows": ["0101…", …]}.
"""
import json, os, sys
import qrcode

url = sys.argv[1]
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
qr.add_data(url)
qr.make(fit=True)
rows = ["".join("1" if m else "0" for m in row) for row in qr.get_matrix()]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr.json")
with open(out, "w") as f:
    json.dump({"url": url, "size": len(rows), "rows": rows}, f)
print(f"{out}: {len(rows)}×{len(rows)} for {url}")
