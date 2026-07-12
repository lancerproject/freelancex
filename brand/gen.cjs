const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const svgPath = path.join(root, "app", "icon.svg");
const outDir = __dirname;
const svg = fs.readFileSync(svgPath);

(async () => {
  for (const size of [1024, 512, 400]) {
    await sharp(svg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `xwork-logo-${size}.png`));
    console.log("wrote xwork-logo-" + size + ".png");
  }
  fs.copyFileSync(svgPath, path.join(outDir, "xwork-logo.svg"));
  console.log("copied master svg");
})();
