// To deploy run : npx hardhat run scripts/deploy-token.js

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Vault
  const Vault = await hre.ethers.getContractFactory("Vault");
  console.log("Deploying Vault...");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  console.log(`Vault deployed to: ${await vault.getAddress()}`);

  // 2. Deploy CasinoLoyaltyToken
  const CasinoLoyaltyToken = await hre.ethers.getContractFactory("CasinoLoyaltyToken");
  console.log("Deploying CasinoLoyaltyToken...");
  const token = await CasinoLoyaltyToken.deploy();
  await token.waitForDeployment();
  console.log(`CasinoLoyaltyToken deployed to: ${await token.getAddress()}`);

  // 3. Deploy Casino
  const Casino = await hre.ethers.getContractFactory("Casino");
  console.log("Deploying Casino...");
  const casino = await Casino.deploy(await vault.getAddress(), await token.getAddress());
  await casino.waitForDeployment();
  console.log(`Casino deployed to: ${await casino.getAddress()}`);

  // 4. Set casino addresses in Vault and Token
  console.log("Setting casino address in Vault...");
  await vault.setCasino(await casino.getAddress());

  console.log("Setting casino address in CasinoLoyaltyToken...");
  await token.setCasino(await casino.getAddress());

  console.log("All contracts deployed and configured!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });