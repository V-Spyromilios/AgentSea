import { FileBlob, PresentationFile, Presentation } from "@oai/artifact-tool";

const INPUT = "/Users/evangelos/Desktop/Marine Agent - polished.pptx";
const OUTPUT = "/Users/evangelos/Documents/AgentSea/tmp/slides/port-congestion-slide/output.pptx";

const COLORS = {
  bgTop: "#06222d",
  bgBottom: "#03131c",
  grid: "#FFFFFF0A",
  title: "#F2EFE8",
  body: "#CDD8D8",
  muted: "#B9C6C7",
  teal: "#9FD8CF",
  tealSoft: "#95D6CD",
  card: "#082635E6",
  cardStroke: "#FFFFFF1F",
  amber: "#FFB74D",
  amberSoft: "#FFD7A1",
  green: "#57D692",
  greenSoft: "#B8F0C9",
};

const blob = await FileBlob.load(INPUT);
const presentation = await PresentationFile.importPptx(blob);
const slide = presentation.slides.add();

const WIDTH = 1280;
const HEIGHT = 720;

function addGrid() {
  for (let x = 0; x <= WIDTH; x += 48) {
    slide.shapes.add({
      geometry: "rect",
      position: { left: x, top: 0, width: 1, height: 360 },
      fill: COLORS.grid,
      line: { width: 0, fill: COLORS.grid },
    });
  }
  for (let y = 0; y <= 360; y += 48) {
    slide.shapes.add({
      geometry: "rect",
      position: { left: 0, top: y, width: WIDTH, height: 1 },
      fill: COLORS.grid,
      line: { width: 0, fill: COLORS.grid },
    });
  }
}

slide.shapes.add({
  geometry: "rect",
  position: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
  fill: COLORS.bgBottom,
  line: { width: 0, fill: COLORS.bgBottom },
});

function addGlow(left, top, width, height, color, opacity) {
  slide.shapes.add({
    geometry: "ellipse",
    position: { left, top, width, height },
    fill: `${color}${opacity}`,
    line: { width: 0, fill: `${color}${opacity}` },
  });
}

function addTextBox({ left, top, width, height, text, fontSize, color = COLORS.title, bold = false, typeface = "Avenir Next", align = "left", lineSpacing = 1.15 }) {
  const shape = slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill: "#00000000",
    line: { width: 0, fill: "#00000000" },
  });
  shape.text = text;
  shape.text.fontSize = fontSize;
  shape.text.color = color;
  shape.text.bold = bold;
  shape.text.typeface = typeface;
  shape.text.alignment = align;
  shape.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  shape.text.autoFit = "shrinkText";
  return shape;
}

function addPill({ left, top, width, text, fill, color }) {
  const shape = slide.shapes.add({
    geometry: "roundRect",
    position: { left, top, width, height: 34 },
    fill,
    line: { width: 0, fill },
    adjustmentList: [{ name: "adj", formula: "val 30000" }],
  });
  shape.text = text;
  shape.text.fontSize = 13;
  shape.text.bold = true;
  shape.text.color = color;
  shape.text.typeface = "Avenir Next";
  shape.text.alignment = "center";
  shape.text.verticalAlignment = "middle";
}

function addCard({ left, top, width, height, eyebrow, title, lines, accent = "teal" }) {
  const borderColor = accent === "amber" ? "#FFB74D33" : accent === "green" ? "#57D69233" : COLORS.cardStroke;
  const accentColor = accent === "amber" ? COLORS.amberSoft : accent === "green" ? COLORS.greenSoft : COLORS.tealSoft;

  slide.shapes.add({
    geometry: "roundRect",
    position: { left, top, width, height },
    fill: COLORS.card,
    line: { width: 1, fill: borderColor },
    adjustmentList: [{ name: "adj", formula: "val 18000" }],
  });

  addTextBox({
    left: left + 26,
    top: top + 22,
    width: width - 52,
    height: 24,
    text: eyebrow,
    fontSize: 12,
    color: accentColor,
    bold: true,
  });

  addTextBox({
    left: left + 26,
    top: top + 54,
    width: width - 52,
    height: 38,
    text: title,
    fontSize: 24,
    color: COLORS.title,
    bold: true,
  });

  addTextBox({
    left: left + 26,
    top: top + 108,
    width: width - 52,
    height: height - 134,
    text: lines.join("\n"),
    fontSize: 21,
    color: COLORS.body,
  });
}

addGlow(-40, -80, 320, 220, "FFB74D", "18");
addGlow(920, -20, 320, 220, "4CAFA0", "18");
addGrid();

addTextBox({
  left: 86,
  top: 72,
  width: 460,
  height: 22,
  text: "SECOND PAID INTELLIGENCE PRODUCT",
  fontSize: 14,
  color: COLORS.teal,
  bold: true,
});

addTextBox({
  left: 86,
  top: 108,
  width: 860,
  height: 56,
  text: "Second Paid Product: Port Congestion Intelligence",
  fontSize: 34,
  color: COLORS.title,
  bold: true,
  typeface: "Georgia",
});

addTextBox({
  left: 86,
  top: 176,
  width: 930,
  height: 36,
  text: "MarineAgent is not a single paid endpoint. It sells multiple maritime decision products to AI agents.",
  fontSize: 19,
  color: COLORS.body,
});

addTextBox({
  left: 86,
  top: 224,
  width: 940,
  height: 30,
  text: "Hamburg Cargo’s AI agent can independently purchase Hamburg port congestion intelligence through the same x402 payment flow.",
  fontSize: 18,
  color: COLORS.title,
});

addPill({
  left: 1012,
  top: 104,
  width: 164,
  text: "Deterministic demo data",
  fill: "#9FD8CF1F",
  color: COLORS.tealSoft,
});

const cardTop = 292;
const cardWidth = 344;
const cardGap = 24;
const left0 = 86;

addCard({
  left: left0,
  top: cardTop,
  width: cardWidth,
  height: 258,
  eyebrow: "REQUEST",
  title: "Port purchase",
  lines: [
    "Port: Hamburg / DEHAM",
    "Product: Port Congestion Intelligence",
    "Endpoint: /v1/ports/DEHAM/congestion",
  ],
  accent: "teal",
});

addCard({
  left: left0 + cardWidth + cardGap,
  top: cardTop,
  width: cardWidth,
  height: 258,
  eyebrow: "X402 PAYMENT",
  title: "Same paywall flow",
  lines: [
    "Real HTTP 402 checkpoint",
    "Algorand TestNet x402 payment",
    "0.02 USDC",
    "Paid result released only after payment",
  ],
  accent: "amber",
});

addCard({
  left: left0 + (cardWidth + cardGap) * 2,
  top: cardTop,
  width: cardWidth,
  height: 258,
  eyebrow: "INTELLIGENCE OUTPUT",
  title: "Operational signal",
  lines: [
    "Congestion: high",
    "Average delay: 28h",
    "Waiting vessels: 14",
    "Berth utilization: 91%",
    "Assessment: berth waiting times likely extended",
  ],
  accent: "green",
});

slide.shapes.add({
  geometry: "roundRect",
  position: { left: 86, top: 592, width: 1108, height: 58 },
  fill: "#081E28CC",
  line: { width: 1, fill: COLORS.cardStroke },
  adjustmentList: [{ name: "adj", formula: "val 18000" }],
});

addTextBox({
  left: 116,
  top: 608,
  width: 1048,
  height: 24,
  text: "ETA Risk and Port Congestion are independent purchasable intelligence products.",
  fontSize: 18,
  color: COLORS.title,
  bold: true,
  align: "center",
});

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUTPUT);
process.exit(0);
