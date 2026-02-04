const hre = require("hardhat");

async function main() {
  const contract = await hre.ethers.getContractAt(
    "SlotMachine",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );
  const owner = await contract.owner();
  console.log(owner);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
