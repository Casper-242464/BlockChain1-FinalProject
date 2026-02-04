# SlotFair Casino

## Prerequisites
- Node.js (LTS recommended)
- MetaMask browser extension

## Install
From the project root, install dependencies in both workspaces:

1) Hardhat
- Open a terminal in the hardhat folder and run:
  - npm install

2) Frontend
- Open a terminal in the frontend folder and run:
  - npm install

## Deployment (Local Hardhat)
1) Start a local Hardhat node:
- In the hardhat folder:
  - npx hardhat node

2) Deploy contracts with Ignition:
- In the hardhat folder (new terminal):
  - npx hardhat ignition deploy ./ignition/modules/Slots.js --network localhost

3) Update frontend contract address (if needed):
- The deployed address is written to:
  - hardhat/ignition/deployments/chain-31337/deployed_addresses.json
- Copy the SlotMachine address into:
  - frontend/contract.js (SLOT_MACHINE_ADDRESS)

## Execution (Frontend)
1) Start the static server:
- In the frontend folder:
  - node server.js

2) Open the app:
- http://localhost:5173

3) Connect MetaMask:
- Add the Hardhat Localhost network:
  - Chain ID: 31337
  - RPC URL: http://127.0.0.1:8545
- Import one of the Hardhat accounts into MetaMask.

## Notes
- The house (owner) wallet must be connected to auto-resolve spins.
- If you redeploy, update SLOT_MACHINE_ADDRESS in frontend/contract.js.
