import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const inputPath = "/Users/evangelos/Desktop/Marine Agent - polished.pptx";

const blob = await FileBlob.load(inputPath);
const presentation = await PresentationFile.importPptx(blob);

const slides = presentation.slides.items.map((slide, index) => {
  const textItems = [];
  for (const shape of slide.shapes.items ?? []) {
    const value = shape?.text?.toString?.();
    if (typeof value === "string" && value.trim()) {
      textItems.push(value.trim());
    }
  }
  return {
    index,
    textItems,
  };
});

console.log(JSON.stringify({
  slideCount: presentation.slides.count,
  slideSize: presentation.slideSize,
  slides,
}, null, 2));

process.exit(0);
