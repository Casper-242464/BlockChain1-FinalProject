const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const SLOT_MACHINE_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const [sender] = await ethers.getSigners();
  const fundAmount = ethers.parseEther("100");
  
  console.log(`Funding ${SLOT_MACHINE_ADDRESS} with ${ethers.formatEther(fundAmount)} ETH...`);
  console.log(`Sender: ${sender.address}`);
  
  const tx = await sender.sendTransaction({
    to: SLOT_MACHINE_ADDRESS,
    value: fundAmount,
  });
  
  console.log(`Transaction hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✓ Contract funded in block ${receipt.blockNumber}`);
  console.log(`✓ New contract balance: ${ethers.formatEther(await ethers.provider.getBalance(SLOT_MACHINE_ADDRESS))} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
