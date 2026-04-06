export async function uploadFileToIPFS(file) {
  const apiToken = process.env.REACT_APP_NFT_STORAGE_TOKEN;

  if (!apiToken) {
    throw new Error("Missing REACT_APP_NFT_STORAGE_TOKEN. Refusing to upload with a hard-coded secret.");
  }

  const response = await fetch("https://api.nft.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });

  if (!response.ok) {
    throw new Error(`NFT.Storage upload failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.value.cid;
}
