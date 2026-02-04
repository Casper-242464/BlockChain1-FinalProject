const ICONS = ["🍒", "🍋", "🔔", "⭐", "7️⃣", "💎", "🍇", "🍀", "🎲", "🔥"];

export function randomSeed() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeSecret(value) {
  if (!value) {
    throw new Error("House secret is required");
  }
  if (value.startsWith("0x") && value.length === 66) {
    return value;
  }
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

export function computeSlotsFromRoll(roll) {
  const r = Number(roll);
  const reel1 = ICONS[r % 10];
  const reel2 = ICONS[Math.floor(r / 10) % 10];
  const reel3 = ICONS[Math.floor(r / 100) % 10];

  let result = "Try again";
  if (r < 5) {
    result = "Jackpot! x10";
  } else if (r < 100) {
    result = "Win! x2";
  }

  return {
    reels: [reel1, reel2, reel3],
    result,
  };
}
