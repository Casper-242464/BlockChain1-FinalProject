export let SLOT_MACHINE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export let SLOT_MACHINE_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "commitHash", "type": "bytes32" }
    ],
    "name": "commitRandom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "userSeed", "type": "bytes32" }
    ],
    "name": "spin",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "player", "type": "address" },
      { "internalType": "bytes32", "name": "houseSecret", "type": "bytes32" }
    ],
    "name": "resolveSpin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentCommit",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minBet",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxBet",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxHighBet",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "loyaltyToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "highBetThreshold",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "player", "type": "address" }],
    "name": "pendingSpins",
    "outputs": [
      { "internalType": "uint256", "name": "wager", "type": "uint256" },
      { "internalType": "uint256", "name": "placedBlock", "type": "uint256" },
      { "internalType": "bytes32", "name": "userSeed", "type": "bytes32" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wager", "type": "uint256" },
      { "indexed": false, "internalType": "bytes32", "name": "userSeed", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "placedBlock", "type": "uint256" }
    ],
    "name": "SpinRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wager", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "roll", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "payout", "type": "uint256" },
      { "indexed": false, "internalType": "bytes32", "name": "houseSecret", "type": "bytes32" }
    ],
    "name": "SpinResolved",
    "type": "event"
  }
];

export function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load contract data from ${url}`);
  }
  return response.json();
};

export async function syncSlotMachineContract({
  dataUrl = "/contract-data/slot-machine.json",
} = {}) {
  const data = await fetchJson(dataUrl);
  if (!data?.address || !data?.abi) {
    throw new Error("Invalid contract data payload");
  }
  SLOT_MACHINE_ADDRESS = data.address;
  SLOT_MACHINE_ABI = data.abi;
  return { address: SLOT_MACHINE_ADDRESS, abi: SLOT_MACHINE_ABI };
}

export async function getSigner() {
  const provider = getProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

export async function getSlotMachine(readOnly = false) {
  if (readOnly) {
    const provider = getProvider();
    const code = await provider.getCode(SLOT_MACHINE_ADDRESS);
    if (!code || code === "0x") {
      throw new Error(`SlotMachine not deployed at ${SLOT_MACHINE_ADDRESS}`);
    }
    return new ethers.Contract(SLOT_MACHINE_ADDRESS, SLOT_MACHINE_ABI, provider);
  }
  const signer = await getSigner();
  const provider = signer.provider;
  if (provider) {
    const code = await provider.getCode(SLOT_MACHINE_ADDRESS);
    if (!code || code === "0x") {
      throw new Error(`SlotMachine not deployed at ${SLOT_MACHINE_ADDRESS}`);
    }
  }
  return new ethers.Contract(SLOT_MACHINE_ADDRESS, SLOT_MACHINE_ABI, signer);
}
