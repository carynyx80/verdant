import { test } from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { verifyMessage } from "viem";
import { metadataHash, metadataSchema, metadataMessage } from "./metadata";
const payload = {
  name: "Verdant",
  symbol: "VERD",
  description: "Test",
  image: "",
  website: "https://example.com",
  x: "",
  telegram: "",
};
test("metadata hashing is canonical and binds every published field", () => {
  assert.equal(
    metadataHash({ ...payload, name: " Verdant " }),
    metadataHash(payload),
  );
  assert.notEqual(
    metadataHash({ ...payload, description: "Changed" }),
    metadataHash(payload),
  );
  assert.throws(() =>
    metadataSchema.parse({ ...payload, website: "javascript:alert(1)" }),
  );
});
test("metadata authorization binds the wallet, payload, nonce, origin and expiry", async () => {
  const wallet = privateKeyToAccount(`0x${"11".repeat(32)}`);
  const message = metadataMessage(
    wallet.address,
    "nonce-one",
    metadataHash(payload),
    "2026-10-23T00:05:00Z",
    "https://api.example.com",
  );
  const signature = await wallet.signMessage({ message });
  assert(await verifyMessage({ address: wallet.address, message, signature }));
  for (const changed of [
    message.replace("nonce-one", "nonce-two"),
    message.replace(
      metadataHash(payload),
      metadataHash({ ...payload, name: "Changed" }),
    ),
    message.replace("api.example.com", "evil.example.com"),
    message.replace("00:05", "00:06"),
  ])
    assert.equal(
      await verifyMessage({
        address: wallet.address,
        message: changed,
        signature,
      }),
      false,
    );
});
