CREATE TABLE "WalletNonce" (
 "id" TEXT NOT NULL,
 "wallet" TEXT NOT NULL,
 "payloadHash" TEXT NOT NULL,
 "message" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "consumedAt" TIMESTAMP(3),
 CONSTRAINT "WalletNonce_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WalletNonce_wallet_expiresAt_idx" ON "WalletNonce"("wallet","expiresAt");
CREATE INDEX "WalletNonce_expiresAt_idx" ON "WalletNonce"("expiresAt");
