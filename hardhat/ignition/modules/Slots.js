const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SlotsModule", (m) => {
  const owner = m.getAccount(0);

  const loyalty = m.contract("LoyaltyToken", [owner]);
  const slotMachine = m.contract("SlotMachine", [owner, loyalty]);

  m.call(loyalty, "setMinter", [slotMachine]);

  return { loyalty, slotMachine };
});

// npx hardhat ignition deploy ./ignition/modules/Slots.js --network localhost