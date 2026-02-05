const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DEPLOYMENTS_PATH = path.join(
  __dirname,
  "..",
  "ignition",
  "deployments",
  "chain-31337",
  "deployed_addresses.json"
);

function loadAddress() {
  const raw = fs.readFileSync(DEPLOYMENTS_PATH, "utf8");
  const data = JSON.parse(raw);
  const address = data["SlotsModule#SlotMachine"];
  if (!address) {
    throw new Error("SlotMachine address not found in deployments");
  }
  return address;
}

function replaceContractAddress(filePath, searchLine, newLine) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let found = false;
  const updated = lines.map(line => {
    if (line.includes(searchLine)) {
      found = true;
      return newLine;
    }
    return line;
  });
  if (!found) {
    throw new Error(`Pattern not found in ${filePath}`);
  }
  fs.writeFileSync(filePath, updated.join("\n"), "utf8");
}

function main() {
  const address = loadAddress();
  const frontendContract = path.join(ROOT, "frontend", "contract.js");
  const fundScript = path.join(ROOT, "hardhat", "scripts", "fundContract.js");

  replaceContractAddress(
    frontendContract,
    "export let SLOT_MACHINE_ADDRESS",
    `export let SLOT_MACHINE_ADDRESS = "${address}";`
  );

  replaceContractAddress(
    fundScript,
    "const SLOT_MACHINE_ADDRESS",
    `  const SLOT_MACHINE_ADDRESS = "${address}";`
  );

  console.log("Updated SlotMachine address:", address);
  console.log("- frontend/contract.js");
  console.log("- hardhat/scripts/fundContract.js");
}

main();
