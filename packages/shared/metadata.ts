import { createHash } from "node:crypto";
import { z } from "zod";
const link = z
  .string()
  .max(512)
  .refine((value) => {
    if (!value) return true;
    try {
      return ["https:", "ipfs:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "HTTPS or IPFS URL required");
export const metadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .refine(
      (v) => Buffer.byteLength(v, "utf8") <= 64,
      "Name exceeds 64 UTF-8 bytes",
    ),
  symbol: z.string().regex(/^[A-Z0-9]{1,12}$/),
  description: z.string().max(2000),
  image: link,
  website: link,
  x: link,
  telegram: link,
});
export function metadataHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(metadataSchema.parse(value)))
    .digest("hex");
}
export function metadataMessage(
  wallet: string,
  nonce: string,
  hash: string,
  expires: string,
  origin: string,
) {
  return `Verdant metadata upload\nOrigin: ${origin}\nWallet: ${wallet.toLowerCase()}\nNonce: ${nonce}\nPayload SHA256: ${hash}\nExpires: ${expires}\nThis signature authorizes one metadata upload. It does not authorize a blockchain transaction.`;
}
