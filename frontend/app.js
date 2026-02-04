import { getSlotMachine, syncSlotMachineContract } from "./contract.js";
import { computeSlotsFromRoll, normalizeSecret, randomSeed } from "./gameLogic.js";

const $ = (id) => document.getElementById(id);
const ids = [
  "accountValue",
  "ethBalanceValue",
  "chainValue",
  "loyaltyValue",
  "homeError",
  "betInput",
  "seedInput",
  "commitValue",
  "limitsValue",
  "slotStatus",
  "reel1",
  "reel2",
  "reel3",
  "connectBtn",
  "spinBtn",
  "resultModal",
  "modalReel1",
  "modalReel2",
  "modalReel3",
  "modalResult",
  "closeModal",
];
const ui = Object.fromEntries(ids.map((id) => [id, $(id)]));

const HARDHAT_CHAIN_ID = 31337n;
const HOUSE_SECRET = "superSecretHouseSeed";
const AUTO_RESOLVE = true;

let currentCommit = "0x";
let cachedOwner = "";
let commitAttempted = false;
let eventBound = false;
const resolving = new Set();

const msg = (el, text) => {
  el.classList.toggle("hidden", !text);
  el.textContent = text || "";
};

const pretty = (err, fallback) => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err?.info?.error?.message) return err.info.error.message;
  if (err?.reason) return err.reason;
  if (err?.message) return err.message;
  return fallback;
};

const onHardhat = async () => {
  if (!window.ethereum) return false;
  const network = await new ethers.BrowserProvider(window.ethereum).getNetwork();
  ui.chainValue.textContent = network.chainId.toString();
  return network.chainId === HARDHAT_CHAIN_ID;
};

const setStatus = (text) => msg(ui.slotStatus, text);
const setHome = (text) => msg(ui.homeError, text);

const refreshEthBalance = async () => {
  try {
    const account = ui.accountValue.textContent;
    if (!account || account === "Not connected") return (ui.ethBalanceValue.textContent = "-");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(account);
    ui.ethBalanceValue.textContent = `${Number(ethers.formatEther(balance)).toFixed(4)} ETH`;
  } catch {
    ui.ethBalanceValue.textContent = "-";
  }
};

const refreshLoyalty = async (contract) => {
  try {
    const account = ui.accountValue.textContent;
    if (!account || account === "Not connected") return (ui.loyaltyValue.textContent = "-");
    const tokenAddress = await contract.loyaltyToken();
    const erc20 = new ethers.Contract(
      tokenAddress,
      [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ],
      contract.runner
    );
    const [balance, decimals] = await Promise.all([
      erc20.balanceOf(account),
      erc20.decimals(),
    ]);
    ui.loyaltyValue.textContent = ethers.formatUnits(balance, decimals);
  } catch {
    ui.loyaltyValue.textContent = "-";
  }
};

const refreshConfig = async () => {
  try {
    const c = await getSlotMachine(true);
    const [minBet, maxBet, maxHighBet, thresholdTokens, commit, owner] = await Promise.all([
      c.minBet(),
      c.maxBet(),
      c.maxHighBet(),
      c.highBetThreshold(),
      c.currentCommit(),
      c.owner(),
    ]);
    currentCommit = commit;
    cachedOwner = owner;
    ui.commitValue.textContent = commit;
    ui.limitsValue.textContent = `Min ${ethers.formatEther(minBet)} ETH • Max ${ethers.formatEther(maxBet)} ETH • High ${ethers.formatEther(maxHighBet)} ETH • High bet unlock at ${ethers.formatUnits(thresholdTokens, 18)} tokens`;
    await refreshEthBalance();
    await refreshLoyalty(c);
  } catch (err) {
    setStatus(pretty(err, "Failed to read contract"));
  }
};

const connectWallet = async () => {
  try {
    setHome("");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const [account] = await provider.send("eth_requestAccounts", []);
    ui.accountValue.textContent = account || "";
    if (!(await onHardhat())) setHome("Switch MetaMask to Hardhat Localhost (chain 31337).");
    await refreshEthBalance();
    await refreshConfig();
    await tryAutoCommit();
  } catch (err) {
    setHome(pretty(err, "Failed to connect"));
  }
};

const commit = async () => {
  if (!HOUSE_SECRET) return;
  try {
    if (!(await onHardhat())) return setStatus("Switch MetaMask to Hardhat Localhost (chain 31337).");
    if (currentCommit && !/^0x0+$/.test(currentCommit)) return;
    const c = await getSlotMachine(false);
    const signer = c.runner;
    if (!signer?.getAddress) return setStatus("Wallet not connected.");
    const signerAddress = await signer.getAddress();
    if (cachedOwner && cachedOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      return setStatus("Auto-resolve needs the owner wallet connected.");
    }
    const commitHash = ethers.keccak256(normalizeSecret(HOUSE_SECRET));
    setStatus("Committing house seed...");
    await (await c.commitRandom(commitHash)).wait();
    ui.commitValue.textContent = commitHash;
    setStatus("Commit set. Players can spin now.");
  } catch (err) {
    setStatus(pretty(err, "Commit failed"));
  }
};

const tryAutoCommit = async () => {
  if (commitAttempted || !HOUSE_SECRET) return;
  if (!currentCommit || /^0x0+$/.test(currentCommit)) {
    commitAttempted = true;
    await commit();
  }
};

const showResult = (reels, result) => {
  [ui.modalReel1, ui.modalReel2, ui.modalReel3].forEach((el, i) => {
    el.textContent = reels[i];
  });
  ui.modalResult.textContent = result;
  ui.resultModal.classList.remove("hidden");
};

const resolvePlayer = async (player) => {
  if (!HOUSE_SECRET) return;
  if (resolving.has(player)) return;
  resolving.add(player);
  try {
    const c = await getSlotMachine(false);
    const signer = c.runner;
    if (!signer?.getAddress) return setStatus("Wallet not connected.");
    const signerAddress = await signer.getAddress();
    if (cachedOwner && cachedOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      return setStatus("Auto-resolve needs the owner wallet connected.");
    }
    if (!currentCommit || /^0x0+$/.test(currentCommit)) await commit();
    const receipt = await (await c.resolveSpin(player, normalizeSecret(HOUSE_SECRET))).wait();
    const resolved = receipt.logs
      .map((log) => {
        try {
          return c.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event && event.name === "SpinResolved");
    if (resolved) {
      const { roll } = resolved.args;
      const { reels, result } = computeSlotsFromRoll(roll);
      ui.reel1.textContent = reels[0];
      ui.reel2.textContent = reels[1];
      ui.reel3.textContent = reels[2];
      setStatus(`Spin resolved: ${result}`);
      showResult(reels, result);
    } else {
      setStatus("Spin resolved.");
    }
    refreshConfig();
  } catch (err) {
    setStatus(pretty(err, "Auto-resolve failed"));
  } finally {
    resolving.delete(player);
  }
};

const setupAutoResolve = async () => {
  if (eventBound) return;
  eventBound = true;
  const readOnly = await getSlotMachine(true);
  readOnly.on("SpinRequested", (player) => {
    if (AUTO_RESOLVE && HOUSE_SECRET && !resolving.has(player)) {
      resolvePlayer(player);
    }
  });
};

const spin = async () => {
  try {
    if (!(await onHardhat())) return setStatus("Switch MetaMask to Hardhat Localhost (chain 31337).");
    if (!currentCommit || /^0x0+$/.test(currentCommit)) return setStatus("Commit not set. Waiting for house commit.");
    setStatus("Submitting spin...");
    const betValue = (ui.betInput.value || "0").replace(",", ".");
    await (await (await getSlotMachine(false)).spin(ui.seedInput.value, {
      value: ethers.parseEther(betValue),
    })).wait();
    setStatus("Spin requested. Waiting for resolve.");
    ui.seedInput.value = randomSeed();
    // Auto-resolve is handled by the SpinRequested event to avoid duplicate resolves.
  } catch (err) {
    setStatus(pretty(err, "Spin failed"));
  }
};

const init = async () => {
  ui.seedInput.value = randomSeed();
  ui.connectBtn.addEventListener("click", connectWallet);
  ui.spinBtn.addEventListener("click", spin);
  ui.closeModal.addEventListener("click", () => ui.resultModal.classList.add("hidden"));
  ui.resultModal.addEventListener("click", (event) => {
    if (event.target === ui.resultModal) ui.resultModal.classList.add("hidden");
  });
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", ([account]) => {
      ui.accountValue.textContent = account || "";
      commitAttempted = false;
      refreshEthBalance();
      refreshConfig();
      tryAutoCommit();
    });
  }
  try {
    await syncSlotMachineContract();
  } catch (err) {
    setHome(pretty(err, "Failed to sync contract data"));
  }
  await refreshConfig();
  await setupAutoResolve();
  await tryAutoCommit();
};

init();
