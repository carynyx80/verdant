-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Token" (
    "address" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "creatorBps" INTEGER NOT NULL,
    "metadataURI" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "trader" TEXT NOT NULL,
    "buy" BOOLEAN NOT NULL,
    "bnb" TEXT NOT NULL,
    "tokens" TEXT NOT NULL,
    "creatorFee" TEXT NOT NULL,
    "protocolFee" TEXT NOT NULL,
    "reserve" TEXT NOT NULL,
    "tokenReserve" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainEvent" (
    "id" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,

    CONSTRAINT "ChainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenMetadata" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "AIAgent" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "budgetMicrousd" BIGINT NOT NULL DEFAULT 0,
    "spentMicrousd" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "AIAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "result" TEXT,
    "maxMicrousd" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExpense" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costMicrousd" BIGINT NOT NULL,
    "invoiceReference" TEXT NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Launch" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "Launch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BondingCurveState" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "BondingCurveState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraduationEvent" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "GraduationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeConfiguration" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "FeeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAccrual" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "FeeAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeDistribution" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "FeeDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuybackExecution" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "BuybackExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurnEvent" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "BurnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityPosition" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "LiquidityPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMilestone" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "ProductMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryPayment" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "TreasuryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorClaim" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "CreatorClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_market_key" ON "Token"("market");

-- CreateIndex
CREATE INDEX "Token_creator_idx" ON "Token"("creator");

-- CreateIndex
CREATE INDEX "Token_blockNumber_idx" ON "Token"("blockNumber");

-- CreateIndex
CREATE INDEX "Trade_token_blockNumber_idx" ON "Trade"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "Trade_trader_idx" ON "Trade"("trader");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_transactionHash_logIndex_key" ON "Trade"("transactionHash", "logIndex");

-- CreateIndex
CREATE INDEX "ChainEvent_contract_name_blockNumber_idx" ON "ChainEvent"("contract", "name", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ChainEvent_transactionHash_logIndex_key" ON "ChainEvent"("transactionHash", "logIndex");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "AIAgent_token_idx" ON "AIAgent"("token");

-- CreateIndex
CREATE INDEX "AgentTask_agentId_status_idx" ON "AgentTask"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentExpense_taskId_key" ON "AgentExpense"("taskId");

-- CreateIndex
CREATE INDEX "AgentExpense_agentId_reconciled_idx" ON "AgentExpense"("agentId", "reconciled");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_wallet_read_idx" ON "Notification"("wallet", "read");

-- CreateIndex
CREATE INDEX "Launch_token_blockNumber_idx" ON "Launch"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "BondingCurveState_token_blockNumber_idx" ON "BondingCurveState"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "GraduationEvent_token_blockNumber_idx" ON "GraduationEvent"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "FeeConfiguration_token_blockNumber_idx" ON "FeeConfiguration"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "FeeAccrual_token_blockNumber_idx" ON "FeeAccrual"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "FeeDistribution_token_blockNumber_idx" ON "FeeDistribution"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "BuybackExecution_token_blockNumber_idx" ON "BuybackExecution"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "BurnEvent_token_blockNumber_idx" ON "BurnEvent"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "LiquidityPosition_token_blockNumber_idx" ON "LiquidityPosition"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "ProductMilestone_token_blockNumber_idx" ON "ProductMilestone"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "TreasuryPayment_token_blockNumber_idx" ON "TreasuryPayment"("token", "blockNumber");

-- CreateIndex
CREATE INDEX "CreatorClaim_token_blockNumber_idx" ON "CreatorClaim"("token", "blockNumber");

