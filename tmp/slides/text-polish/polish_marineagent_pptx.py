from __future__ import annotations

import copy
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)


INPUT_PATH = Path("/Users/evangelos/Desktop/Marine Agent - themed.pptx")
OUTPUT_PATH = Path("/Users/evangelos/Documents/AgentSea/tmp/slides/text-polish/Marine Agent - polished.pptx")


def emu(px: int) -> str:
    return str(px * 9525)


def shape_text(sp: ET.Element) -> str:
    parts: list[str] = []
    for paragraph in sp.findall(".//a:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//a:t", NS))
        if text:
            parts.append(text)
    return " | ".join(parts)


def find_shape_by_text(root: ET.Element, expected: str) -> ET.Element:
    for sp in root.findall(".//p:sp", NS):
        if shape_text(sp) == expected:
            return sp
    raise ValueError(f"Could not find shape with text: {expected}")


def find_shape_by_box(root: ET.Element, box: tuple[int, int, int, int]) -> ET.Element:
    for sp in root.findall(".//p:sp", NS):
        xfrm = sp.find("./p:spPr/a:xfrm", NS)
        if xfrm is None:
            continue
        off = xfrm.find("a:off", NS)
        ext = xfrm.find("a:ext", NS)
        if off is None or ext is None:
            continue
        current = (
            int(off.get("x")) // 9525,
            int(off.get("y")) // 9525,
            int(ext.get("cx")) // 9525,
            int(ext.get("cy")) // 9525,
        )
        if current == box:
            return sp
    raise ValueError(f"Could not find shape with box: {box}")


def set_box(sp: ET.Element, *, x: int | None = None, y: int | None = None, w: int | None = None, h: int | None = None) -> None:
    xfrm = sp.find("./p:spPr/a:xfrm", NS)
    if xfrm is None:
        raise ValueError("Shape is missing xfrm")
    off = xfrm.find("a:off", NS)
    ext = xfrm.find("a:ext", NS)
    if off is None or ext is None:
        raise ValueError("Shape is missing xfrm off/ext")
    if x is not None:
        off.set("x", emu(x))
    if y is not None:
        off.set("y", emu(y))
    if w is not None:
        ext.set("cx", emu(w))
    if h is not None:
        ext.set("cy", emu(h))


def set_paragraph_font_size(paragraph: ET.Element, size: int | None) -> None:
    if size is None:
        return
    for tag in ("a:defRPr", "a:endParaRPr", "a:r/a:rPr", "a:fld/a:rPr"):
        for node in paragraph.findall(f".//{tag}", NS):
            node.set("sz", str(size))


def set_text(sp: ET.Element, lines: list[str], font_size: int | None = None) -> None:
    tx_body = sp.find("./p:txBody", NS)
    if tx_body is None:
        raise ValueError("Shape is missing txBody")
    paragraphs = tx_body.findall("./a:p", NS)
    if not paragraphs:
        raise ValueError("Shape is missing paragraphs")
    template = paragraphs[0]
    p_pr_template = template.find("./a:pPr", NS)
    run_template = template.find("./a:r", NS)
    if run_template is None:
        run_template = ET.Element(f"{{{NS['a']}}}r")
        ET.SubElement(run_template, f"{{{NS['a']}}}rPr")
        ET.SubElement(run_template, f"{{{NS['a']}}}t")

    for paragraph in list(paragraphs):
        tx_body.remove(paragraph)

    for line in lines:
        paragraph = ET.Element(f"{{{NS['a']}}}p")
        if p_pr_template is not None:
            paragraph.append(copy.deepcopy(p_pr_template))
        run = copy.deepcopy(run_template)
        text_node = run.find("./a:t", NS)
        if text_node is None:
            text_node = ET.SubElement(run, f"{{{NS['a']}}}t")
        text_node.text = line
        paragraph.append(run)
        set_paragraph_font_size(paragraph, font_size)
        tx_body.append(paragraph)


def set_text_with_breaks(sp: ET.Element, lines: list[str], font_size: int | None = None) -> None:
    tx_body = sp.find("./p:txBody", NS)
    if tx_body is None:
        raise ValueError("Shape is missing txBody")
    paragraphs = tx_body.findall("./a:p", NS)
    if not paragraphs:
        raise ValueError("Shape is missing paragraphs")
    template = paragraphs[0]
    p_pr_template = template.find("./a:pPr", NS)
    run_template = template.find("./a:r", NS)
    if run_template is None:
        run_template = ET.Element(f"{{{NS['a']}}}r")
        ET.SubElement(run_template, f"{{{NS['a']}}}rPr")
        ET.SubElement(run_template, f"{{{NS['a']}}}t")

    for paragraph in list(paragraphs):
        tx_body.remove(paragraph)

    paragraph = ET.Element(f"{{{NS['a']}}}p")
    if p_pr_template is not None:
        paragraph.append(copy.deepcopy(p_pr_template))

    for index, line in enumerate(lines):
        run = copy.deepcopy(run_template)
        text_node = run.find("./a:t", NS)
        if text_node is None:
            text_node = ET.SubElement(run, f"{{{NS['a']}}}t")
        text_node.text = line
        paragraph.append(run)
        if index < len(lines) - 1:
            paragraph.append(ET.Element(f"{{{NS['a']}}}br"))

    set_paragraph_font_size(paragraph, font_size)
    tx_body.append(paragraph)


def update_slide_1(root: ET.Element) -> None:
    left_card = find_shape_by_text(
        root,
        "Hamburg Cargo's AI operations agent requests ETA risk intelligence, receives a real HTTP 402 x402 payment requirement, settles on Algorand TestNet, and unlocks business-ready maritime guidance.",
    )
    set_text(
        left_card,
        [
            "Hamburg Cargo’s AI agent requests ETA risk intelligence.",
            "MarineAgent returns a real HTTP 402 x402 payment requirement.",
            "After Algorand TestNet payment, ETA intelligence is released.",
        ],
        font_size=1650,
    )
    set_box(left_card, y=324, h=118)

    proof = find_shape_by_text(
        root,
        "Real HTTP 402, real Algorand TestNet payment requirement, and paid ETA intelligence released only after settlement.",
    )
    set_text(
        proof,
        ["Real HTTP 402, real Algorand TestNet payment, and paid ETA intelligence released only after settlement."],
        font_size=1275,
    )
    set_box(proof, y=546, h=60)

    flow_last = find_shape_by_text(root, "ETA intelligence")
    set_text(flow_last, ["ETA Intelligence"])


def update_slide_2(root: ET.Element) -> None:
    op_title = find_shape_by_text(root, "Decision Output")
    set_text(op_title, ["Operational Decision"])

    formula_title = find_shape_by_text(root, "Forecast formula")
    set_text(formula_title, ["ETA risk calculation"])

    formula = find_shape_by_text(
        root,
        "Realistic ETA = current time + remaining sea-route distance / effective speed + weather delay + port congestion delay + uncertainty buffer",
    )
    set_text_with_breaks(
        formula,
        [
            "Realistic ETA =",
            "now",
            "+ remaining sea-route distance / effective speed",
            "+ weather delay",
            "+ port congestion delay",
            "+ uncertainty buffer",
        ],
        font_size=825,
    )
    set_box(formula, y=604, h=54)

    footer = find_shape_by_text(root, "MarineAgent turns maritime telemetry into business decisions for autonomous software buyers.")
    set_text(
        footer,
        ["Future providers: AIS APIs, maritime routing APIs, marine weather APIs, and port congestion APIs."],
        font_size=825,
    )
    set_box(footer, y=694, w=980, h=14)

    panel = find_shape_by_box(root, (74, 558, 1134, 106))
    set_box(panel, h=126)


def update_slide_xml(name: str, xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    if name.endswith("slide1.xml"):
        update_slide_1(root)
    elif name.endswith("slide2.xml"):
        update_slide_2(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(INPUT_PATH, "r") as src, zipfile.ZipFile(OUTPUT_PATH, "w", compression=zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename in {"ppt/slides/slide1.xml", "ppt/slides/slide2.xml"}:
                data = update_slide_xml(info.filename, data)
            dst.writestr(info, data)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
