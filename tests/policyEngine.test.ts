import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/engine/policyEngine.js';
import {
  AgentContext,
  AgentPolicyContext,
  VendorContext,
  PaymentIntentInput,
} from '../src/engine/types.js';

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
      spentDaily: 19500.0, // Daily budget is 20,000. Remaining: 500
    };

    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1000.0, // 19500 + 1000 = 20500 > 20000 limit
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
      spentMonthly: 98000.0, // Monthly budget is 100,000. Remaining: 2000
    };

    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 3000.0, // 98000 + 3000 = 101000 > 100000 limit
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
