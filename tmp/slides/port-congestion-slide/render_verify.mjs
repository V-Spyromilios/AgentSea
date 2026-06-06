import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const inputPath = "/Users/evangelos/Documents/AgentSea/tmp/slides/port-congestion-slide/output.pptx";
const outDir = "/Users/evangelos/Documents/AgentSea/tmp/slides/port-congestion-slide/renders";

await fs.mkdir(outDir, { recursive: true });

const blob = await FileBlob.load(inputPath);
const presentation = await PresentationFile.importPptx(blob);

for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  const bytes = png instanceof Blob ? Buffer.from(await png.arrayBuffer()) : Buffer.from(png);
  await fs.writeFile(path.join(outDir, `slide-${i + 1}.png`), bytes);
}

console.log(JSON.stringify({ renderedSlides: presentation.slides.count, outDir }, null, 2));
process.exit(0);
