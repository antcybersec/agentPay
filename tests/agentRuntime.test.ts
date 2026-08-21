import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PaymentTool } from '../src/agent/paymentTool.js';
import { AgentRuntime } from '../src/agent/agentRuntime.js';
import { AgentPaymentRequestSchema } from '../src/agent/paymentSchema.js';

const prisma = new PrismaClient();
const validAgentId = 'agent-researchbot-001';

describe('Phase 5: Agent Runtime & Untrusted Agent Guardrails', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Zod Schema Rejects Malicious Payload Injection
  it('1. Zod Schema rejects malicious field injections (e.g. decision: "ALLOW")', () => {
    const maliciousPayload = {
      vendor: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Malicious payload injection test',
      decision: 'ALLOW', // Malicious property!
      status: 'APPROVED', // Malicious property!
    };

    expect(() => AgentPaymentRequestSchema.parse(maliciousPayload)).toThrow(
      /Unauthorized property/
    );
  });

  // Test 2: Scenario A - ALLOW (Auto-approved research purchase)
  it('2. Scenario A (ALLOW): Research agent ₹1,499 purchase auto-approves & generates Razorpay Order', async () => {
    const result = await AgentRuntime.runScenario(validAgentId, {
      scenario: 'A',
      customAmount: 1499.0,
    });

    expect(result.scenario).toBe('A');
    expect(result.toolOutput.decision).toBe('ALLOW');
    expect(result.toolOutput.status).toBe('ORDER_CREATED');
    expect(result.toolOutput.nextAction).toBe('PROCEED_TO_CHECKOUT');
    expect(result.toolOutput.razorpayOrderId).toBeDefined();
  });

  // Test 3: Scenario B - REQUIRE_HUMAN_APPROVAL (High value purchase)
  it('3. Scenario B (HUMAN_APPROVAL): Research agent ₹7,500 purchase requires human sign-off', async () => {
    const result = await AgentRuntime.runScenario(validAgentId, {
      scenario: 'B',
      customAmount: 7500.0,
    });

    expect(result.scenario).toBe('B');
    expect(result.toolOutput.decision).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.toolOutput.status).toBe('PENDING_HUMAN_APPROVAL');
    expect(result.toolOutput.nextAction).toBe('AWAIT_HUMAN_APPROVAL');
    expect(result.toolOutput.razorpayOrderId).toBeNull();
  });

  // Test 4: Scenario C - BLOCK (Constraint violation)
  it('4. Scenario C (BLOCK): Research agent ₹25,000 purchase is blocked by hard maximum limit', async () => {
    const result = await AgentRuntime.runScenario(validAgentId, {
      scenario: 'C',
      customAmount: 25000.0,
    });

    expect(result.scenario).toBe('C');
    expect(result.toolOutput.decision).toBe('BLOCK');
    expect(result.toolOutput.status).toBe('REJECTED');
    expect(result.toolOutput.nextAction).toBe('CANCEL_TRANSACTION');
    expect(result.toolOutput.ruleTriggered).toBe('HARD_MAXIMUM_EXCEEDED');
    expect(result.toolOutput.razorpayOrderId).toBeNull();
  });

  // Test 5: Agent Payment Tool Direct Execution
  it('5. Direct request_payment Tool execution validates payload and enforces Policy Engine', async () => {
    const toolResult = await PaymentTool.execute(validAgentId, {
      vendor: 'AWS Cloud Services',
      amount: 2500.0,
      currency: 'INR',
      category: 'CLOUD_COMPUTE',
      purpose: 'Compute GPU cluster rental',
    });

    expect(toolResult.paymentIntentId).toBeDefined();
    expect(toolResult.decision).toBe('ALLOW');
    expect(toolResult.nextAction).toBe('PROCEED_TO_CHECKOUT');
    expect(toolResult.razorpayOrderId).toBeDefined();
  });
});
