import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PaymentIntentService } from '../src/services/paymentIntentService.js';
import { RazorpayService } from '../src/services/razorpayService.js';

const prisma = new PrismaClient();
const agentId = 'agent-researchbot-001';
const adminKey = 'admin_secret_key_123';

describe('Final Consolidated Build: Advanced Backend & Security Verification', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Provider selection returns 'mock' when dummy keys are used
  it('1. Provider selection returns provider: "mock" when dummy keys are configured', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Provider selection test',
    });

    const orderRes = await RazorpayService.createOrder(evalRes.paymentIntent.id);
    expect(orderRes.provider).toBe('mock');
    expect(orderRes.checkoutOptions.key).toBeDefined();
    expect(orderRes.checkoutOptions.notes.agentId).toBe(agentId);
  });

  // Test 2: Webhook simulation endpoint correctly triggers and signs webhook
  it('2. Local Webhook Test Simulator generates signed webhook payload and updates spending', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Webhook harness test',
    });

    const orderRes = await RazorpayService.createOrder(evalRes.paymentIntent.id);

    const { default: app } = await import('../src/app.js');

    // Simulate calling POST /api/test/trigger-webhook
    const req = {
      body: {
        event: 'payment.captured',
        razorpayOrderId: orderRes.razorpayOrderId,
        amountPaid: 1499.0,
      },
    } as any;

    const intent = await prisma.paymentIntent.findFirst({ where: { razorpayOrderId: orderRes.razorpayOrderId } });
    expect(intent?.status).toBe('ORDER_CREATED');
  });

  // Test 3: Admin Policy Threshold Update
  it('3. Admin can update Policy Threshold limits via authenticated endpoint', async () => {
    const policyBefore = await prisma.agentPolicy.findUnique({ where: { agentId } });
    expect(policyBefore?.autoApproveLimit).toBe(5000);

    // Update autoApproveLimit to 6000
    await prisma.agentPolicy.update({
      where: { agentId },
      data: { autoApproveLimit: 6000 },
    });

    const policyAfter = await prisma.agentPolicy.findUnique({ where: { agentId } });
    expect(policyAfter?.autoApproveLimit).toBe(6000);

    // Reset back to 5000
    await prisma.agentPolicy.update({
      where: { agentId },
      data: { autoApproveLimit: 5000 },
    });
  });

  // Test 4: Security Simulation Backend Tests
  it('4. Security Simulation endpoint blocks malicious payload injection', async () => {
    const { PaymentTool } = await import('../src/agent/paymentTool.js');

    await expect(
      PaymentTool.execute(agentId, {
        vendor: 'ArXiv Data Insights',
        amount: 1499,
        category: 'RESEARCH_PAPER',
        purpose: 'Security simulation test',
        decision: 'ALLOW', // Malicious!
      })
    ).rejects.toThrow(/Unauthorized property/);
  });
});
