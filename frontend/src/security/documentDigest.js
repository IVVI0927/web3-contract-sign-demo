export async function digestFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `0x${hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function shortenHex(value, size = 10) {
  if (!value || value.length <= size * 2) {
    return value;
  }

  return `${value.slice(0, size)}...${value.slice(-size)}`;
}
