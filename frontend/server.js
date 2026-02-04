import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5173;

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/contract-data/slot-machine.json") {
      const deploymentsPath = path.join(
        __dirname,
        "..",
        "hardhat",
        "ignition",
        "deployments",
        "chain-31337",
        "deployed_addresses.json"
      );
      const artifactPath = path.join(
        __dirname,
        "..",
        "hardhat",
        "artifacts",
        "contracts",
        "SlotMachine.sol",
        "SlotMachine.json"
      );
      const [deploymentsRaw, artifactRaw] = await Promise.all([
        readFile(deploymentsPath, "utf8"),
        readFile(artifactPath, "utf8"),
      ]);
      const deployments = JSON.parse(deploymentsRaw);
      const artifact = JSON.parse(artifactRaw);
      const address = deployments["SlotsModule#SlotMachine"];
      if (!address || !artifact?.abi) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "SlotMachine contract data not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ address, abi: artifact.abi }));
      return;
    }
    let filePath = path.join(__dirname, urlPath === "/" ? "/index.html" : urlPath);

    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat || fileStat.isDirectory()) {
      filePath = path.join(__dirname, "index.html");
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const data = await readFile(filePath);

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Static server running on http://localhost:${PORT}`);
});
