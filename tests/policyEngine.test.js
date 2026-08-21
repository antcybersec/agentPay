"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const policyEngine_js_1 = require("../src/engine/policyEngine.js");
(0, vitest_1.describe)('Deterministic Policy Engine Unit Tests', () => {
    // Setup baseline Mock Agent
    const mockAgent = {
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
    const mockPolicy = {
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
    const mockArxivVendor = {
        id: 'vendor-arxiv-001',
        name: 'ArXiv Data Insights',
        domain: 'arxiv.org',
        category: 'RESEARCH_PAPER',
        status: 'VERIFIED',
    };
    // Setup baseline Mock Blocked Vendor
    const mockCasinoVendor = {
        id: 'vendor-casino-004',
        name: 'Shady Casino Online',
        domain: 'shadycasino.com',
        category: 'GAMBLING',
        status: 'BLOCKED',
    };
    // Test 1: ALLOW
    (0, vitest_1.it)('should return ALLOW for valid transaction within auto-approve limit', () => {
        const paymentIntent = {
            rawVendorName: 'ArXiv Data Insights',
            amount: 500.0, // <= autoApproveLimit (1000)
            currency: 'INR',
            category: 'RESEARCH_PAPER',
            purpose: 'Download machine learning research benchmark dataset',
        };
        const result = policyEngine_js_1.PolicyEngine.evaluate({
            agent: mockAgent,
            policy: mockPolicy,
            vendor: mockArxivVendor,
            paymentIntent,
        });
        (0, vitest_1.expect)(result.decision).toBe('ALLOW');
        (0, vitest_1.expect)(result.approved).toBe(true);
        (0, vitest_1.expect)(result.requiresHumanReview).toBe(false);
        (0, vitest_1.expect)(result.ruleTriggered).toBe('AUTO_APPROVED');
        (0, vitest_1.expect)(result.reason).toContain('within auto-approval threshold');
    });
    // Test 2: BLOCK (Blocked Category & Vendor)
    (0, vitest_1.it)('should return BLOCK for transaction to blocked vendor & category (GAMBLING)', () => {
        const paymentIntent = {
            rawVendorName: 'Shady Casino Online',
            amount: 200.0,
            currency: 'INR',
            category: 'GAMBLING',
            purpose: 'Online gaming token purchase',
        };
        const result = policyEngine_js_1.PolicyEngine.evaluate({
            agent: mockAgent,
            policy: mockPolicy,
            vendor: mockCasinoVendor,
            paymentIntent,
        });
        (0, vitest_1.expect)(result.decision).toBe('BLOCK');
        (0, vitest_1.expect)(result.approved).toBe(false);
        (0, vitest_1.expect)(result.ruleTriggered).toBe('VENDOR_BLOCKED');
        (0, vitest_1.expect)(result.reason).toContain('explicitly blocked');
    });
    // Test 3: REQUIRE_HUMAN_APPROVAL
    (0, vitest_1.it)('should return REQUIRE_HUMAN_APPROVAL when amount exceeds auto-approve threshold but is <= human approval threshold', () => {
        const paymentIntent = {
            rawVendorName: 'ArXiv Data Insights',
            amount: 1800.0, // > autoApproveLimit (1000) and <= humanApprovalThreshold (2500)
            currency: 'INR',
            category: 'RESEARCH_PAPER',
            purpose: 'Annual research database API access fee',
        };
        const result = policyEngine_js_1.PolicyEngine.evaluate({
            agent: mockAgent,
            policy: mockPolicy,
            vendor: mockArxivVendor,
            paymentIntent,
        });
        (0, vitest_1.expect)(result.decision).toBe('REQUIRE_HUMAN_APPROVAL');
        (0, vitest_1.expect)(result.approved).toBe(false);
        (0, vitest_1.expect)(result.requiresHumanReview).toBe(true);
        (0, vitest_1.expect)(result.ruleTriggered).toBe('HUMAN_APPROVAL_REQUIRED');
        (0, vitest_1.expect)(result.reason).toContain('Requires human sign-off');
    });
    // Test 4: Insufficient Budget
    (0, vitest_1.it)('should return BLOCK for insufficient daily budget', () => {
        const agentNearingLimit = {
            ...mockAgent,
            spentDaily: 4600.0, // Daily budget is 5000. Remaining daily budget is 400.
        };
        const paymentIntent = {
            rawVendorName: 'ArXiv Data Insights',
            amount: 500.0, // 4600 + 500 = 5100 > 5000 limit
            currency: 'INR',
            category: 'RESEARCH_PAPER',
            purpose: 'Additional paper dataset',
        };
        const result = policyEngine_js_1.PolicyEngine.evaluate({
            agent: agentNearingLimit,
            policy: mockPolicy,
            vendor: mockArxivVendor,
            paymentIntent,
        });
        (0, vitest_1.expect)(result.decision).toBe('BLOCK');
        (0, vitest_1.expect)(result.approved).toBe(false);
        (0, vitest_1.expect)(result.ruleTriggered).toBe('DAILY_BUDGET_EXCEEDED');
        (0, vitest_1.expect)(result.reason).toContain('Insufficient budget');
    });
    // Test 5: Unknown Vendor
    (0, vitest_1.it)('should return BLOCK when vendor is unknown or unregistered', () => {
        const paymentIntent = {
            rawVendorName: 'Unregistered Suspicious Vendor',
            amount: 300.0,
            currency: 'INR',
            category: 'RESEARCH_PAPER',
            purpose: 'Buying unverified research dataset',
        };
        const result = policyEngine_js_1.PolicyEngine.evaluate({
            agent: mockAgent,
            policy: mockPolicy,
            vendor: null, // Unknown vendor
            paymentIntent,
        });
        (0, vitest_1.expect)(result.decision).toBe('BLOCK');
        (0, vitest_1.expect)(result.approved).toBe(false);
        (0, vitest_1.expect)(result.ruleTriggered).toBe('UNKNOWN_VENDOR');
        (0, vitest_1.expect)(result.reason).toContain('Unknown vendor');
    });
});
