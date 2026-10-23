ALTER TABLE "Token" ADD COLUMN "factory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChainEvent" ADD COLUMN "factory" TEXT NOT NULL DEFAULT '';
CREATE TABLE "CanonicalBlock" (
 "id" TEXT NOT NULL,
 "checkpointId" TEXT NOT NULL,
 "blockNumber" BIGINT NOT NULL,
 "blockHash" TEXT NOT NULL,
 CONSTRAINT "CanonicalBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanonicalBlock_checkpointId_blockNumber_key" ON "CanonicalBlock"("checkpointId","blockNumber");
CREATE INDEX "CanonicalBlock_checkpointId_blockNumber_idx" ON "CanonicalBlock"("checkpointId","blockNumber");
