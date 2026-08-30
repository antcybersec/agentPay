import { prisma } from '../prisma.js';

let isInitialized = false;

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "apiKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dailyBudget" REAL NOT NULL,
    "monthlyBudget" REAL NOT NULL,
    "spentDaily" REAL NOT NULL DEFAULT 0.0,
    "spentMonthly" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "AgentPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "autoApproveLimit" REAL NOT NULL DEFAULT 5000.0,
    "humanApprovalLimit" REAL NOT NULL DEFAULT 10000.0,
    "hardMaximum" REAL NOT NULL DEFAULT 10000.0,
    "allowedCategories" TEXT NOT NULL,
    "blockedCategories" TEXT NOT NULL,
    "allowedVendorIds" TEXT NOT NULL,
    "requireVendorVerification" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentPolicy_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "razorpayAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "PaymentIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "vendorId" TEXT,
    "rawVendorName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "category" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "decision" TEXT,
    "rejectionReason" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentIntent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentIntent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentIntentId" TEXT,
    "agentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "decision" TEXT,
    "reason" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Agent_apiKey_key" ON "Agent"("apiKey");
CREATE UNIQUE INDEX IF NOT EXISTS "AgentPolicy_agentId_key" ON "AgentPolicy"("agentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_domain_key" ON "Vendor"("domain");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_agentId_idempotencyKey_key" ON "PaymentIntent"("agentId", "idempotencyKey");
`;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Ensure SQLite schema tables exist (for ephemeral /tmp serverless databases)
    const statements = SCHEMA_DDL.split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err) {
        // Table or index may already exist
      }
    }

    // 2. Check if agent exists
    const agentCount = await prisma.agent.count().catch(() => 0);
    if (agentCount > 0) {
      isInitialized = true;
      return;
    }

    console.log('[AgentPay DB] Initializing seed data in database...');

    // 3. Vendors
    const vendorArxiv = await prisma.vendor.upsert({
      where: { domain: 'arxiv.org' },
      update: {},
      create: {
        id: 'vendor-arxiv-001',
        name: 'ArXiv Data Insights',
        domain: 'arxiv.org',
        category: 'RESEARCH_PAPER',
        status: 'VERIFIED',
        razorpayAccountId: 'acc_arxiv_test_123',
      },
    });

    const vendorStatista = await prisma.vendor.upsert({
      where: { domain: 'statista.com' },
      update: {},
      create: {
        id: 'vendor-statista-002',
        name: 'Statista Market Research',
        domain: 'statista.com',
        category: 'DATASET',
        status: 'VERIFIED',
        razorpayAccountId: 'acc_statista_test_456',
      },
    });

    const vendorAws = await prisma.vendor.upsert({
      where: { domain: 'aws.amazon.com' },
      update: {},
      create: {
        id: 'vendor-aws-003',
        name: 'AWS Cloud Services',
        domain: 'aws.amazon.com',
        category: 'CLOUD_COMPUTE',
        status: 'VERIFIED',
        razorpayAccountId: 'acc_aws_test_789',
      },
    });

    await prisma.vendor.upsert({
      where: { domain: 'shadycasino.com' },
      update: {},
      create: {
        id: 'vendor-casino-004',
        name: 'Shady Casino Online',
        domain: 'shadycasino.com',
        category: 'GAMBLING',
        status: 'BLOCKED',
      },
    });

    // 4. Agent (ResearchBot)
    const agent = await prisma.agent.upsert({
      where: { apiKey: 'agkey_researchbot_7f8a9b2c3d' },
      update: {},
      create: {
        id: 'agent-researchbot-001',
        name: 'ResearchBot',
        role: 'Autonomous AI Researcher & Data Procurement Agent',
        apiKey: 'agkey_researchbot_7f8a9b2c3d',
        status: 'ACTIVE',
        dailyBudget: 20000.0,
        monthlyBudget: 100000.0,
        spentDaily: 800.0,
        spentMonthly: 4500.0,
      },
    });

    // 5. Agent Policy
    await prisma.agentPolicy.upsert({
      where: { agentId: agent.id },
      update: {},
      create: {
        id: 'policy-researchbot-001',
        agentId: agent.id,
        autoApproveLimit: 5000.0,
        humanApprovalLimit: 10000.0,
        hardMaximum: 10000.0,
        allowedCategories: JSON.stringify(['RESEARCH_PAPER', 'DATASET', 'CLOUD_COMPUTE', 'API_SUBSCRIPTION']),
        blockedCategories: JSON.stringify(['GAMBLING', 'CRYPTO', 'GIFT_CARDS']),
        allowedVendorIds: JSON.stringify([vendorArxiv.id, vendorStatista.id, vendorAws.id]),
        requireVendorVerification: true,
        isActive: true,
      },
    });

    console.log('[AgentPay DB] Database seeding completed successfully.');
    isInitialized = true;
  } catch (error) {
    console.warn('[AgentPay DB] Database seed initialization notice:', error);
  }
}
