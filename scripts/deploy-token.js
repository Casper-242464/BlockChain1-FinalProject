// To deploy run : npx hardhat run scripts/deploy-token.js

async function main() {
  // 1. Get the contract to deploy
  const MyToken = await hre.ethers.getContractFactory("CasinoChipToken");
  console.log("Deploying CasinoChipToken...");

  // 2. Deploy the contract with constructor arguments
  const tokenName = "Casino Chip Token";
  const tokenSymbol = "CCT";
  const initialSupply = hre.ethers.parseEther("1000000"); // 1 million tokens with 18 decimals
  const myToken = await MyToken.deploy(tokenName, tokenSymbol, initialSupply);

  await myToken.waitForDeployment();

  console.log(`CasinoChipToken deployed to:`, await myToken.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });