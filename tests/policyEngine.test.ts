import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/engine/policyEngine.js';
import {
  AgentContext,
  AgentPolicyContext,
  VendorContext,
  PaymentIntentInput,
} from '../src/engine/types.js';

describe('Deterministic Policy Engine Unit Tests', () => {
  // Setup baseline Mock Agent
  const mockAgent: AgentContext = {
    id: 'agent-researchbot-001',
    name: 'ResearchBot',
    role: 'Autonomous AI Researcher',
    status: 'ACTIVE',
    dailyBudget: 5000.0,
    monthlyBudget: 50000.0,
    perTxLimit: 2500.0,
    spentDaily: 800.0,
    spentMonthly: 4500.0,
  };

  // Setup baseline Mock Policy
  const mockPolicy: AgentPolicyContext = {
    id: 'policy-001',
    agentId: 'agent-researchbot-001',
    autoApproveLimit: 1000.0,
    humanApprovalThreshold: 2500.0,
    allowedCategories: ['RESEARCH_PAPER', 'DATASET', 'CLOUD_COMPUTE', 'API_SUBSCRIPTION'],
    blockedCategories: ['GAMBLING', 'CRYPTO', 'GIFT_CARDS'],
    allowedVendorIds: ['vendor-arxiv-001', 'vendor-statista-002', 'vendor-aws-003'],
    requireVendorVerification: true,
    isActive: true,
  };

  // Setup baseline Mock Verified Vendor
  const mockArxivVendor: VendorContext = {
    id: 'vendor-arxiv-001',
    name: 'ArXiv Data Insights',
    domain: 'arxiv.org',
    category: 'RESEARCH_PAPER',
    status: 'VERIFIED',
  };

  // Setup baseline Mock Blocked Vendor
  const mockCasinoVendor: VendorContext = {
    id: 'vendor-casino-004',
    name: 'Shady Casino Online',
    domain: 'shadycasino.com',
    category: 'GAMBLING',
    status: 'BLOCKED',
  };

  // Test 1: ALLOW
  it('should return ALLOW for valid transaction within auto-approve limit', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 500.0, // <= autoApproveLimit (1000)
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Download machine learning research benchmark dataset',
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
    expect(result.reason).toContain('within auto-approval threshold');
  });

  // Test 2: BLOCK (Blocked Category & Vendor)
  it('should return BLOCK for transaction to blocked vendor & category (GAMBLING)', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'Shady Casino Online',
      amount: 200.0,
      currency: 'INR',
      category: 'GAMBLING',
      purpose: 'Online gaming token purchase',
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
    expect(result.reason).toContain('explicitly blocked');
  });

  // Test 3: REQUIRE_HUMAN_APPROVAL
  it('should return REQUIRE_HUMAN_APPROVAL when amount exceeds auto-approve threshold but is <= human approval threshold', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1800.0, // > autoApproveLimit (1000) and <= humanApprovalThreshold (2500)
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Annual research database API access fee',
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
    expect(result.reason).toContain('Requires human sign-off');
  });

  // Test 4: Insufficient Budget
  it('should return BLOCK for insufficient daily budget', () => {
    const agentNearingLimit: AgentContext = {
      ...mockAgent,
      spentDaily: 4600.0, // Daily budget is 5000. Remaining daily budget is 400.
    };

    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'ArXiv Data Insights',
      amount: 500.0, // 4600 + 500 = 5100 > 5000 limit
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Additional paper dataset',
    };

    const result = PolicyEngine.evaluate({
      agent: agentNearingLimit,
      policy: mockPolicy,
      vendor: mockArxivVendor,
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('DAILY_BUDGET_EXCEEDED');
    expect(result.reason).toContain('Insufficient budget');
  });

  // Test 5: Unknown Vendor
  it('should return BLOCK when vendor is unknown or unregistered', () => {
    const paymentIntent: PaymentIntentInput = {
      rawVendorName: 'Unregistered Suspicious Vendor',
      amount: 300.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Buying unverified research dataset',
    };

    const result = PolicyEngine.evaluate({
      agent: mockAgent,
      policy: mockPolicy,
      vendor: null, // Unknown vendor
      paymentIntent,
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.approved).toBe(false);
    expect(result.ruleTriggered).toBe('UNKNOWN_VENDOR');
    expect(result.reason).toContain('Unknown vendor');
  });
});
