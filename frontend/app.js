import * as ethers from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";
import { getSlotMachine, syncSlotMachineContract, SLOT_MACHINE_ADDRESS } from "./contract.js";
import { computeSlotsFromRoll, normalizeSecret, randomSeed, ICONS } from "./gameLogic.js";

// ============================================
// Utility: DOM Selector
// ============================================
const $ = (sel) => {
  if (typeof sel === "string" && sel.startsWith("#")) {
    return document.querySelector(sel);
  }
  return document.getElementById(sel);
};

// ============================================
// Constants & Config
// ============================================
const TARGET_CHAIN_ID_DEC = 31337;
const TARGET_CHAIN_ID_HEX = "0x7A69";
const HOUSE_SECRET = "superSecretHouseSeed";
const AUTO_RESOLVE = true;

// ============================================
// State
// ============================================
let currentCommit = "0x";
let cachedOwner = "";
let commitAttempted = false;
let eventBound = false;
const resolving = new Set();
let userAddress = null;
let stopReels = null;

// ============================================
// UI Helpers
// ============================================
function shortAddr(a) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatEth(value) {
  try {
    return `${Number(ethers.formatEther(value)).toFixed(4)} ETH`;
  } catch {
    return `${value}`;
  }
}

function formatTokens(value, decimals) {
  try {
    return ethers.formatUnits(value, decimals);
  } catch {
    return `${value}`;
  }
}

function pretty(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err?.info?.error?.message) return err.info.error.message;
  if (err?.reason) return err.reason;
  if (err?.message) return err.message;
  return fallback;
}

function toast(type, title, msg = "") {
  const wrap = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="toast-title">${title}</div>
    ${msg ? `<div class="toast-msg">${msg}</div>` : ""}
  `;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function logLine(text, kind = "info") {
  const box = $("#log");
  const line = document.createElement("div");
  line.className = `log-line ${kind}`;
  line.textContent = `[${nowTime()}] ${text}`;
  box.prepend(line);
}

function setStatus(text, kind = "neutral") {
  const s = $("#status");
  s.textContent = text;
  s.className = `pill ${kind}`;
}

function setBusy(isBusy) {
  $("#btnConnect").disabled = isBusy;
  $("#btnSpin").disabled = isBusy || !userAddress;
  $("#betEth").disabled = isBusy || !userAddress;
}

// ============================================
// UI Setup
// ============================================
function initContractAddr() {
  const contractAddrEl = $("#contractAddr");
  if (contractAddrEl) {
    contractAddrEl.textContent = shortAddr(SLOT_MACHINE_ADDRESS);
  }
}

const onHardhat = async () => {
  if (!window.ethereum) return false;
  const network = await new ethers.BrowserProvider(window.ethereum).getNetwork();
  $("#net").textContent = `chainId ${Number(network.chainId)}`;
  return Number(network.chainId) === TARGET_CHAIN_ID_DEC;
};

const ensureEthereum = () => {
  if (!window.ethereum) {
    setStatus("MetaMask not found", "bad");
    logLine("MetaMask not detected - please install MetaMask extension", "err");
    toast("err", "MetaMask not found", "Install MetaMask extension and refresh.");
    throw new Error("MetaMask not found");
  }
};

async function refreshBalance() {
  try {
    const c = await getSlotMachine(true);
    const account = userAddress;
    if (!account) return ($("#bal").textContent = "-");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(account);
    $("#bal").textContent = formatEth(balance);
  } catch {
    $("#bal").textContent = "-";
  }
}

async function refreshLoyalty() {
  try {
    const account = userAddress;
    if (!account) return ($("#loyalty").textContent = "-");
    const c = await getSlotMachine(true);
    const tokenAddress = await c.loyaltyToken();
    const erc20 = new ethers.Contract(
      tokenAddress,
      [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ],
      c.runner
    );
    const [balance, decimals] = await Promise.all([
      erc20.balanceOf(account),
      erc20.decimals(),
    ]);
    $("#loyalty").textContent = formatTokens(balance, decimals);
  } catch {
    $("#loyalty").textContent = "-";
  }
}

async function refreshConfig() {
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
    logLine(`Config: min ${formatEth(minBet)} • max ${formatEth(maxBet)}`, "ok");
    await refreshBalance();
    await refreshLoyalty();
  } catch (err) {
    logLine(pretty(err, "Failed to read contract"), "err");
  }
}

async function connect() {
  try {
    ensureEthereum();
    setBusy(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    userAddress = accounts?.[0] || null;

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    if (chainId !== TARGET_CHAIN_ID_DEC) {
      setStatus(`Wrong network (chainId ${chainId})`, "warn");
      toast("warn", "Wrong network", "Switching to Hardhat Localhost...");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: TARGET_CHAIN_ID_HEX }],
        });
      } catch (e) {
        logLine("Please manually switch to Hardhat (chainId 31337)", "err");
      }
    }

    $("#acc").textContent = shortAddr(userAddress);
    setStatus("Connected", "good");
    toast("ok", "Wallet connected", shortAddr(userAddress));
    logLine(`Connected: ${userAddress}`, "ok");

    await syncSlotMachineContract();
    await refreshBalance();
    await refreshLoyalty();
    await refreshConfig();
    await tryAutoCommit();
    await setupAutoResolve();

    setBusy(false);
  } catch (e) {
    setBusy(false);
    setStatus("Connect failed", "bad");
    toast("err", "Connection failed", e?.message || String(e));
    logLine(`Connect error: ${e?.message || e}`, "err");
  }
}

const commit = async () => {
  if (!HOUSE_SECRET) return;
  try {
    if (!(await onHardhat())) return setStatus("Switch to Hardhat (31337).", "warn");
    if (currentCommit && !/^0x0+$/.test(currentCommit)) return;
    
    const c = await getSlotMachine(false);
    const signer = c.runner;
    if (!signer?.getAddress) return setStatus("Wallet not connected.", "bad");
    
    const signerAddress = await signer.getAddress();
    if (cachedOwner && cachedOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      return setStatus("Need owner wallet for auto-resolve", "bad");
    }
    
    const commitHash = ethers.keccak256(normalizeSecret(HOUSE_SECRET));
    setStatus("Committing house seed...", "neutral");
    logLine("Committing house seed...");
    
    await (await c.commitRandom(commitHash)).wait();
    currentCommit = commitHash;
    setStatus("Commit set ✓", "good");
    logLine("House commit successful", "ok");
    toast("ok", "House seed committed");
  } catch (err) {
    setStatus("Commit failed", "bad");
    logLine(pretty(err, "Commit failed"), "err");
    toast("err", "Commit failed", pretty(err));
  }
};

const tryAutoCommit = async () => {
  if (commitAttempted || !HOUSE_SECRET) return;
  if (!currentCommit || /^0x0+$/.test(currentCommit)) {
    commitAttempted = true;
    await commit();
  }
};

const resolvePlayer = async (player) => {
  if (!HOUSE_SECRET) return;
  if (resolving.has(player)) return;
  resolving.add(player);
  
  try {
    const c = await getSlotMachine(false);
    const signer = c.runner;
    if (!signer?.getAddress) return setStatus("Wallet not connected.", "bad");
    
    const signerAddress = await signer.getAddress();
    if (cachedOwner && cachedOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      return setStatus("Need owner wallet for resolve", "bad");
    }
    
    if (!currentCommit || /^0x0+$/.test(currentCommit)) await commit();
    
    logLine(`Resolving spin for ${shortAddr(player)}...`, "info");
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
      $("#r1").textContent = reels[0];
      $("#r2").textContent = reels[1];
      $("#r3").textContent = reels[2];
      if (stopReels) {
        stopReels();
        stopReels = null;
      }
      setStatus(`Result: ${result}`, "good");
      logLine(`Spin resolved: ${result}`, "ok");
      $("#lastResult").textContent = result;
      toast("ok", "Spin resolved", result);
    } else {
      if (stopReels) {
        stopReels();
        stopReels = null;
      }
      setStatus("Spin resolved ✓", "good");
      logLine("Spin resolved", "ok");
    }
    
    await refreshConfig();
    await refreshLoyalty();
  } catch (err) {
    if (stopReels) {
      stopReels();
      stopReels = null;
    }
    setStatus("Resolve failed", "bad");
    logLine(pretty(err, "Auto-resolve failed"), "err");
  } finally {
    resolving.delete(player);
  }
};

const setupAutoResolve = async () => {
  if (eventBound) return;
  eventBound = true;
  try {
    const readOnly = await getSlotMachine(true);
    readOnly.on("SpinRequested", (player) => {
      if (AUTO_RESOLVE && HOUSE_SECRET && !resolving.has(player)) {
        logLine(`SpinRequested: ${shortAddr(player)}`);
        resolvePlayer(player);
      }
    });
    logLine("Auto-resolve listener attached", "ok");
  } catch (err) {
    logLine("Could not setup auto-resolve: " + err.message, "err");
  }
};

function randomSymbol() {
  return ICONS[Math.floor(Math.random() * ICONS.length)];
}

function startReels() {
  ["#r1", "#r2", "#r3"].forEach((id) => $(id).classList.add("spin"));
  const timers = [];
  timers.push(setInterval(() => ($("#r1").textContent = randomSymbol()), 70));
  timers.push(setInterval(() => ($("#r2").textContent = randomSymbol()), 80));
  timers.push(setInterval(() => ($("#r3").textContent = randomSymbol()), 90));
  return () => {
    timers.forEach(clearInterval);
    ["#r1", "#r2", "#r3"].forEach((id) => $(id).classList.remove("spin"));
  };
}

async function spin() {
  if (!userAddress) return toast("warn", "Connect wallet first");
  
  try {
    setBusy(true);

    const bet = Number($("#betEth").value || 0);
    if (!Number.isFinite(bet) || bet <= 0) {
      setBusy(false);
      return toast("warn", "Invalid bet", "Enter bet > 0");
    }

    if (!(await onHardhat())) {
      setBusy(false);
      return setStatus("Wrong network", "bad");
    }

    if (!currentCommit || /^0x0+$/.test(currentCommit)) {
      setBusy(false);
      return setStatus("Waiting for house commit...", "warn");
    }

    setStatus("Submitting spin...", "neutral");
    if (stopReels) {
      stopReels();
    }
    stopReels = startReels();

    const c = await getSlotMachine(false);
    const seed = $("#betEth").dataset.seed || randomSeed();
    
    logLine(`Spinning with bet ${bet} ETH...`);
    const tx = await c.spin(normalizeSecret(seed), {
      value: ethers.parseEther(String(bet)),
    });
    
    logLine(`Tx: ${shortAddr(tx.hash)}`, "ok");
    $("#lastTx").textContent = shortAddr(tx.hash);
    toast("ok", "Spin submitted", `${bet} ETH`);

    const receipt = await tx.wait();

    setStatus("Spin requested", "neutral");
    $("#lastResult").textContent = "Waiting for resolve...";
    logLine(`Confirmed. Block ${receipt.blockNumber}`, "ok");
    
    await refreshBalance();
    await refreshLoyalty();
    setBusy(false);
  } catch (e) {
    setBusy(false);
    if (stopReels) {
      stopReels();
      stopReels = null;
    }
    setStatus("Spin failed", "bad");
    toast("err", "Spin failed", pretty(e));
    logLine(`Spin error: ${pretty(e)}`, "err");
  }
}

function attachListeners() {
  $("#btnConnect").onclick = connect;
  $("#btnSpin").onclick = spin;
  $("#btnClear").onclick = () => ($("#log").innerHTML = "");

  if (window.ethereum?.on) {
    window.ethereum.on("accountsChanged", () => {
      logLine("Account changed. Reconnect needed.", "err");
      toast("warn", "Account changed");
      setStatus("Account changed", "warn");
      userAddress = null;
      $("#acc").textContent = "—";
      $("#bal").textContent = "—";
      $("#btnSpin").disabled = true;
      commitAttempted = false;
    });

    window.ethereum.on("chainChanged", () => {
      logLine("Chain changed. Reloading...", "err");
      toast("warn", "Chain changed");
      location.reload();
    });
  }
}

async function boot() {
  initContractAddr();
  attachListeners();
  logLine("Ready. Click Connect Wallet to start.", "ok");
  
  try {
    await refreshConfig();
  } catch {}
}

boot();
