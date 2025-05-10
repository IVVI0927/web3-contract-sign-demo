import { NFTStorage } from "nft.storage";

const API_TOKEN = "3a25e993.76698e9f46d84934871dc78e761caafa";

const client = new NFTStorage({ token: API_TOKEN });

export async function uploadFileToIPFS(file) {
  const cid = await client.storeBlob(file);
  return cid;
}