"""Synthetic test documents only; requires Pillow to regenerate JPG/PNG files."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "document-import"
folder.mkdir(parents=True, exist_ok=True)

def pdf(lines):
    escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    stream = "BT /F1 14 Tf 40 800 Td " + " 0 -32 Td ".join(f"({line}) Tj" for line in escaped) + " ET"
    objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    output = "%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(output.encode("ascii")))
        output += f"{index} 0 obj\n{obj}\nendobj\n"
    xref = len(output.encode("ascii"))
    output += "xref\n0 6\n0000000000 65535 f \n" + "".join(f"{offset:010d} 00000 n \n" for offset in offsets[1:])
    output += f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return output.encode("ascii")

def picture(lines, filename):
    canvas = Image.new("RGB", (1500, 900), "white")
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 34)
    except OSError:
        font = ImageFont.truetype("DejaVuSans.ttf", 34)
    for i, line in enumerate(lines):
        draw.text((60, 60 + i * 85), line, font=font, fill="#18201e")
    canvas.save(folder / filename)

def field(name, value, unit, excerpt, basis=None):
    return dict(field=name, value=value, unit=unit, sourcePage=1, sourceExcerpt=excerpt, needsConfirmation=True, calculationBasis=basis)

examples = []
bill = ["SYNTHETIC ELECTRICITY BILL - test fixture only", "Tariff type: Flat", "Billing period: 01/09/2026 to 30/09/2026", "Electricity usage rate: 30 c/kWh", "Whole-home consumption: 650 kWh", "Daily supply charge: 110 c/day", "Solar feed-in credit: 7 c/kWh", "No actual customer, address or account information."]
examples.append(dict(file="electricity-bill.pdf", mime="application/pdf", kind="electricity-bill", acRole="existing", lines=bill, raw=dict(fields=[field("usageRateAud", 30, "c/kWh", bill[3]), field("periodStart", "2026-09-01", None, bill[2]), field("periodEnd", "2026-09-30", None, bill[2]), field("tariffType", "Flat", None, bill[1])]), expected=dict(usageRateAud=30, periodStart="2026-09-01", periodEnd="2026-09-30", tariffType="Flat")))
label = ["SYNTHETIC AC LABEL - test fixture only", "Model identifiers: SYNTH-IN / SYNTH-OUT", "Annual cooling energy: 600 kWh/year (Average climate)", "Annual heating energy: 900 kWh/year", "Cooling capacity: 2.5 kW", "Actual operating hours are not stated."]
examples.append(dict(file="ac-label.png", mime="image/png", kind="ac-label", acRole="existing", lines=label, raw=dict(fields=[field("existingModel", "SYNTH-IN / SYNTH-OUT", None, label[1]), field("existingKwh", 600, "kWh/year", label[2], "Average climate")]), expected=dict(existingModel="SYNTH-IN / SYNTH-OUT", existingKwh=600)))
quote = ["SYNTHETIC INSTALLATION QUOTE - test fixture only", "Currency: AUD", "Quote date: 2026-09-30", "Total installed upfront cost: AUD 1200", "Inclusions: removal, installation and electrical work.", "Maintenance: AUD 10 per month.", "An annual maintenance total is not stated."]
examples.append(dict(file="installation-quote.jpg", mime="image/jpeg", kind="installation-quote", acRole="proposed", lines=quote, raw=dict(fields=[field("installedCost", 1200, "AUD", quote[3]), field("currency", "AUD", None, quote[1]), field("quoteScope", "removal, installation and electrical work.", None, quote[4]), field("quoteDate", "2026-09-30", None, quote[2]), field("proposedRecurring", 10, "AUD/month", quote[5], "per month")]), expected=dict(installedCost=1200, currency="AUD", quoteScope="removal, installation and electrical work.", quoteDate="2026-09-30", proposedRecurring=10)))
partial = ["SYNTHETIC PARTIAL QUOTE - test fixture only", "Quote amount: price to be confirmed", "Inclusions: installation only", "No explicit currency, quote date or recurring amount.", "Missing information must stay unknown, not zero."]
examples.append(dict(file="incomplete-quote.pdf", mime="application/pdf", kind="installation-quote", acRole="proposed", lines=partial, raw=dict(fields=[field("quoteScope", "installation only", None, partial[2])]), expected=dict(installedCost=None, currency=None, quoteScope="installation only", quoteDate=None, proposedRecurring=None)))
tou = ["SYNTHETIC TIME-OF-USE BILL - test fixture only", "Tariff type: Time-of-use", "Billing period: 01/09/2026 to 30/09/2026", "Peak usage rate: 35 c/kWh", "Shoulder usage rate: 28 c/kWh", "Off-peak usage rate: 20 c/kWh", "Whole-home consumption: 700 kWh", "An average or single flat usage rate is not stated."]
examples.append(dict(file="time-of-use.pdf", mime="application/pdf", kind="electricity-bill", acRole="existing", lines=tou, raw=dict(fields=[field("tariffType", "Time-of-use", None, tou[1]), field("usageRateAud", 35, "c/kWh", tou[3])]), expected=dict(usageRateAud=None, periodStart=None, periodEnd=None, tariffType="Time-of-use")))
for example in examples:
    if example["mime"] == "application/pdf":
        (folder / example["file"]).write_bytes(pdf(example["lines"]))
    else:
        picture(example["lines"], example["file"])
(folder / "examples.json").write_text(json.dumps(examples, indent=2) + "\n", encoding="utf-8")
