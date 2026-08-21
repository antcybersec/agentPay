import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PolicyEngine } from '../src/engine/policyEngine.js';
import { PaymentIntentService } from '../src/services/paymentIntentService.js';
import {
  AgentContext,
  AgentPolicyContext,
  VendorContext,
  PaymentIntentInput,
} from '../src/engine/types.js';

const prisma = new PrismaClient();

describe('Deterministic Policy Engine Correction Suite', () => {
  // Demo Agent setup
  const mockAgent: AgentContext = {
    id: 'agent-researchbot-001',
    name: 'ResearchBot',
    role: 'Autonomous AI Researcher',
    status: 'ACTIVE',
    dailyBudget: 20000.0,
    monthlyBudget: 100000.0,
    spentDaily: 800.0,
    spentMonthly: 4500.0,
  };

  // Demo Policy setup (autoApproveLimit: 5000, humanApprovalLimit: 10000, hardMaximum: 10000)
  const mockPolicy: AgentPolicyContext = {
    id: 'policy-001',
    agentId: 'agent-researchbot-001',
    autoApproveLimit: 5000.0,
    humanApprovalLimit: 10000.0,
    hardMaximum: 10000.0,
    allowedCategories: ['RESEARCH_PAPER', 'DATASET', 'CLOUD_COMPUTE', 'API_SUBSCRIPTION'],
    blockedCategories: ['GAMBLING', 'CRYPTO', 'GIFT_CARDS'],
    allowedVendorIds: ['vendor-arxiv-001', 'vendor-statista-002', 'vendor-aws-003'],
    requireVendorVerification: true,
    isActive: true,
  };

  // Demo Verified Vendor
  const mockArxivVendor: VendorContext = {
    id: 'vendor-arxiv-001',
    name: 'ArXiv Data Insights',
    domain: 'arxiv.org',
    category: 'RESEARCH_PAPER',
    status: 'VERIFIED',
  };

  // Demo Blocked Vendor
  const mockCasinoVendor: VendorContext = {
    id: 'vendor-casino-004',
    name: 'Shady Casino Online',
    domain: 'shadycasino.com',
    category: 'GAMBLING',
    status: 'BLOCKED',
  };

  // Test 1: ₹1,499 verified vendor → ALLOW
  it('1. should return ALLOW for ₹1,499 transaction with verified vendor (<= ₹5,000)', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Download dataset',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('ALLOW');
    expect(result.approved).toBe(true);
    expect(result.requiresHumanReview).toBe(false);
    expect(result.ruleTriggered).toBe('AUTO_APPROVED');
    expect(result.evalSnapshot.purpose).toBe('Download dataset');
  });

  // Test 2: ₹7,500 verified vendor → REQUIRE_HUMAN_APPROVAL
  it('2. should return REQUIRE_HUMAN_APPROVAL for ₹7,500 transaction with verified vendor (₹5,000 < amount <= ₹10,000)', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 7500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Annual research access fee',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.approved).toBe(false);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.ruleTriggered).toBe('HUMAN_APPROVAL_REQUIRED');
  });

  // Test 3: ₹25,000 verified vendor → BLOCK
  it('3. should return BLOCK for ₹25,000 transaction with verified vendor (> ₹10,000 hard maximum)', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 25000.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Enterprise site license',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('HARD_MAXIMUM_EXCEEDED');
  });

  // Test 4: ₹7,500 unknown vendor → REQUIRE_HUMAN_APPROVAL
  it('4. should return REQUIRE_HUMAN_APPROVAL for ₹7,500 transaction with unknown vendor', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'Unregistered Analytics Inc',
      amount: 7500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Custom market research',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: null, // Unknown vendor
      paymentIntent,
    });

    expect(result.decision).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.approved).toBe(false);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.ruleTriggered).toBe('UNKNOWN_VENDOR_REQUIRES_HUMAN_APPROVAL');
  });

  // Test 5: blocked vendor → BLOCK
  it('5. should return BLOCK for transaction with explicitly blocked vendor', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'Shady Casino Online',
      amount: 200.0,
      currency: 'INR',
      category: 'GAMBLING',
      purpose: 'Online gaming tokens',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: mockCasinoVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('VENDOR_BLOCKED');
  });

  // Test 6: blocked category → BLOCK
  it('6. should return BLOCK for transaction with explicitly blocked category', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1000.0,
      currency: 'INR',
      category: 'GAMBLING',
      purpose: 'Gambling category test',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('BLOCKED_CATEGORY');
  });

  // Test 7: daily budget exceeded → BLOCK
  it('7. should return BLOCK when transaction exceeds daily budget', () => {
    const agentNearDailyLimit: AgentContext = {
      ...mockAgent,
      spentDaily: 19500.0,
    };

    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1000.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Paper dataset download',
    };

    const result = PolicyEngine.evaluate({
      agent: agentNearDailyLimit,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('DAILY_BUDGET_EXCEEDED');
  });

  // Test 8: monthly budget exceeded → BLOCK
  it('8. should return BLOCK when transaction exceeds monthly budget', () => {
    const agentNearMonthlyLimit: AgentContext = {
      ...mockAgent,
      spentMonthly: 98000.0,
    };

    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 3000.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Large dataset subscription',
    };

    const result = PolicyEngine.evaluate({
      agent: agentNearMonthlyLimit,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('MONTHLY_BUDGET_EXCEEDED');
  });

  // Test 9: inactive agent → BLOCK
  it('9. should return BLOCK when agent status is inactive/paused', () => {
    const inactiveAgent: AgentContext = {
      ...mockAgent,
      status: 'PAUSED',
    };

    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Paper access',
    };

    const result = PolicyEngine.evaluate({
      agent: inactiveAgent,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('AGENT_INACTIVE');
  });
});

describe('Idempotency & Database Integration Tests', () => {
  const testAgentId = 'agent-researchbot-001';
  const secondAgentId = 'agent-secondbot-002';

  beforeAll(async () => {
    // Ensure secondary test agent exists for cross-agent key testing
    await prisma.agent.upsert({
      where: { id: secondAgentId },
      update: {},
      create: {
        id: secondAgentId,
        name: 'SecondBot',
        role: 'Backup Research Agent',
        status: 'ACTIVE',
        dailyBudget: 20000.0,
        monthlyBudget: 100000.0,
        spentDaily: 0.0,
        spentMonthly: 0.0,
        policy: {
          create: {
            id: 'policy-secondbot-002',
            autoApproveLimit: 5000.0,
            humanApprovalLimit: 10000.0,
            hardMaximum: 10000.0,
            allowedCategories: JSON.stringify(['RESEARCH_PAPER']),
            blockedCategories: JSON.stringify(['GAMBLING']),
            allowedVendorIds: JSON.stringify(['vendor-arxiv-001']),
            requireVendorVerification: true,
            isActive: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('First request creates PaymentIntent & AuditEvent', async () => {
    const key = `test-key-unique-${Date.now()}`;
    const result = await PaymentIntentService.evaluateAndCreateIntent(testAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Testing idempotency creation',
      idempotencyKey: key,
    });

    expect(result.isIdempotentReplay).toBe(false);
    expect(result.paymentIntent.idempotencyKey).toBe(key);
    expect(result.paymentIntent.status).toBe('APPROVED');
    expect(result.paymentIntent.decision).toBe('ALLOW');
    expect(result.auditEvent).toBeDefined();

    // Verify purpose is in audit snapshot
    const metadata = JSON.parse(result.auditEvent.metadata);
    expect(metadata.evalSnapshot.purpose).toBe('Testing idempotency creation');
  });

  it('Identical retry with same idempotencyKey returns existing PaymentIntent without creating another AuditEvent', async () => {
    const key = `test-key-retry-${Date.now()}`;
    
    // First call
    const res1 = await PaymentIntentService.evaluateAndCreateIntent(testAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Testing retry behavior',
      idempotencyKey: key,
    });

    const initialAuditCount = await prisma.auditEvent.count({
      where: { paymentIntentId: res1.paymentIntent.id },
    });
    expect(initialAuditCount).toBe(1);

    // Second (retry) call
    const res2 = await PaymentIntentService.evaluateAndCreateIntent(testAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Testing retry behavior',
      idempotencyKey: key,
    });

    expect(res2.isIdempotentReplay).toBe(true);
    expect(res2.paymentIntent.id).toBe(res1.paymentIntent.id);
    expect(res2.evaluation.decision).toBe(res1.evaluation.decision);

    const postRetryAuditCount = await prisma.auditEvent.count({
      where: { paymentIntentId: res1.paymentIntent.id },
    });
    expect(postRetryAuditCount).toBe(1); // AuditEvent count remains 1!
  });

  it('Same idempotencyKey with a different agent does NOT reuse another agent PaymentIntent', async () => {
    const sharedKey = `shared-key-test-${Date.now()}`;

    // Agent 1 creates intent with key
    const resAgent1 = await PaymentIntentService.evaluateAndCreateIntent(testAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Agent 1 request',
      idempotencyKey: sharedKey,
    });

    // Agent 2 creates intent with same key string
    const resAgent2 = await PaymentIntentService.evaluateAndCreateIntent(secondAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Agent 2 request',
      idempotencyKey: sharedKey,
    });

    expect(resAgent2.isIdempotentReplay).toBe(false);
    expect(resAgent2.paymentIntent.id).not.toBe(resAgent1.paymentIntent.id);
    expect(resAgent2.paymentIntent.agentId).toBe(secondAgentId);
  });

  it('Requests without idempotencyKey continue working normally', async () => {
    const res1 = await PaymentIntentService.evaluateAndCreateIntent(testAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'No key request 1',
    });

    const res2 = await PaymentIntentService.evaluateAndCreateIntent(testAgentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'No key request 2',
    });

    expect(res1.paymentIntent.idempotencyKey).toBeNull();
    expect(res2.paymentIntent.idempotencyKey).toBeNull();
    expect(res1.paymentIntent.id).not.toBe(res2.paymentIntent.id);
  });
});
