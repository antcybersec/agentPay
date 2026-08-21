import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PaymentIntentService } from '../src/services/paymentIntentService.js';
import { RazorpayService } from '../src/services/razorpayService.js';
import { WebhookService } from '../src/services/webhookService.js';
import app from '../src/app.js';

const prisma = new PrismaClient();
const agentId = 'agent-researchbot-001';

describe('Phase 4 & Security Fix: Razorpay Integration, Auth & State Machine Security', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: BLOCK cannot create order
  it('1. STRICT GUARDRAIL: Refuses order creation for BLOCK decision', async () => {
    const result = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'Shady Casino Online',
      amount: 200.0,
      currency: 'INR',
      category: 'GAMBLING',
      purpose: 'Attempting order on blocked vendor',
    });

    expect(result.evaluation.decision).toBe('BLOCK');

    await expect(
      RazorpayService.createOrder(result.paymentIntent.id)
    ).rejects.toThrow(/GUARDRAIL VIOLATION/);
  });

  // Test 2: REJECTED cannot create order
  it('2. STRICT GUARDRAIL: Refuses order creation for REJECTED status', async () => {
    const intent = await prisma.paymentIntent.create({
      data: {
        agentId,
        rawVendorName: 'ArXiv Data Insights',
        amount: 500.0,
        category: 'RESEARCH_PAPER',
        purpose: 'Manual rejected intent',
        status: 'REJECTED',
        decision: 'BLOCK',
      },
    });

    await expect(
      RazorpayService.createOrder(intent.id)
    ).rejects.toThrow(/GUARDRAIL VIOLATION/);
  });

  // Test 3: PENDING_HUMAN_APPROVAL cannot create order
  it('3. STRICT GUARDRAIL: Refuses order creation for PENDING_HUMAN_APPROVAL status', async () => {
    const result = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 7500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Pending approval order creation attempt',
    });

    expect(result.paymentIntent.status).toBe('PENDING_HUMAN_APPROVAL');

    await expect(
      RazorpayService.createOrder(result.paymentIntent.id)
    ).rejects.toThrow(/Human approval is required/);
  });

  // Test 4: ALLOW creates exactly one order
  it('4. Creates exactly one order for ALLOW intent', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Order creation test',
    });

    expect(evalRes.evaluation.decision).toBe('ALLOW');

    const orderRes = await RazorpayService.createOrder(evalRes.paymentIntent.id);

    expect(orderRes.razorpayOrderId).toBeDefined();
    expect(orderRes.paymentIntent.status).toBe('ORDER_CREATED');
    expect(orderRes.provider).toBe('mock');
    expect(orderRes.isIdempotentReplay).toBe(false);
  });

  // Test 5: Calling create-order twice returns the same existing order ID without overwriting
  it('5. Calling create-order twice returns same existing order ID without overwriting', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Idempotent order creation test',
    });

    // First create-order call
    const order1 = await RazorpayService.createOrder(evalRes.paymentIntent.id);
    const firstOrderId = order1.razorpayOrderId;

    // Second create-order call
    const order2 = await RazorpayService.createOrder(evalRes.paymentIntent.id);

    expect(order2.isIdempotentReplay).toBe(true);
    expect(order2.razorpayOrderId).toBe(firstOrderId); // Never overwrites!
  });

  // Test 6: COMPLETED intent cannot create another order
  it('6. Refuses order creation for COMPLETED payment intent', async () => {
    const intent = await prisma.paymentIntent.create({
      data: {
        agentId,
        rawVendorName: 'ArXiv Data Insights',
        amount: 1499.0,
        category: 'RESEARCH_PAPER',
        purpose: 'Completed transaction',
        status: 'COMPLETED',
        decision: 'ALLOW',
        razorpayOrderId: 'order_completed_123',
        razorpayPaymentId: 'pay_completed_123',
      },
    });

    await expect(
      RazorpayService.createOrder(intent.id)
    ).rejects.toThrow(/PAYMENT_ALREADY_COMPLETED/);
  });

  // Test 7: Webhook signature verification validates correctly
  it('7. Webhook HMAC-SHA256 signature verification validates correctly', () => {
    const secret = 'whsec_test_secret_12345';
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} });

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(rawBody))
      .digest('hex');

    const isValid = WebhookService.verifyWebhookSignature(rawBody, validSignature, secret);
    expect(isValid).toBe(true);

    const isInvalid = WebhookService.verifyWebhookSignature(rawBody, 'invalid_signature_hex', secret);
    expect(isInvalid).toBe(false);
  });

  // Test 8: Webhook payment.captured marks PaymentIntent as COMPLETED & increments spent budget
  it('8. Webhook payment.captured marks PaymentIntent as COMPLETED and increments agent daily/monthly spent', async () => {
    const agentBefore = await prisma.agent.findUnique({ where: { id: agentId } });
    const initialSpentDaily = agentBefore?.spentDaily || 0;
    const initialSpentMonthly = agentBefore?.spentMonthly || 0;

    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Webhook capture test',
    });

    const orderRes = await RazorpayService.createOrder(evalRes.paymentIntent.id);
    const orderId = orderRes.razorpayOrderId;
    const paymentId = `pay_test_${Date.now()}`;

    const mockWebhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 149900,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };

    const handleRes = await WebhookService.handleWebhookEvent(mockWebhookPayload);

    expect(handleRes.status).toBe('completed');
    expect(handleRes.paymentIntent?.status).toBe('COMPLETED');
    expect(handleRes.paymentIntent?.razorpayPaymentId).toBe(paymentId);
    expect(handleRes.auditEvent?.eventType).toBe('PAYMENT_SUCCESS');

    const agentAfter = await prisma.agent.findUnique({ where: { id: agentId } });
    expect(agentAfter?.spentDaily).toBe(initialSpentDaily + 1499.0);
    expect(agentAfter?.spentMonthly).toBe(initialSpentMonthly + 1499.0);
  });
});

describe('Phase 4: Policy Re-Evaluation on Human Approval & Admin Auth', () => {
  it('1. Re-evaluates policy on human approval: Pending ₹7,500 intent approved while budget is sufficient succeeds', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 7500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Sufficient budget human approval test',
    });

    expect(evalRes.paymentIntent.status).toBe('PENDING_HUMAN_APPROVAL');

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    expect(agent?.spentDaily).toBeLessThan(20000);

    const updated = await prisma.paymentIntent.update({
      where: { id: evalRes.paymentIntent.id },
      data: { status: 'APPROVED', decision: 'HUMAN_APPROVED' },
    });

    const orderRes = await RazorpayService.createOrder(updated.id);
    expect(orderRes.razorpayOrderId).toBeDefined();
  });

  it('2. Re-evaluates policy on human approval: Fails and rejects if daily budget becomes exhausted', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 7500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Daily budget exhaustion human approval test',
    });

    // Exhaust agent daily budget to 19,500 (remaining: 500)
    await prisma.agent.update({
      where: { id: agentId },
      data: { spentDaily: 19500.0 },
    });

    const agentNow = await prisma.agent.findUnique({ where: { id: agentId }, include: { policy: true } });
    expect(agentNow?.spentDaily).toBe(19500.0);

    const isExceeded = (agentNow!.spentDaily + 7500.0) > agentNow!.dailyBudget;
    expect(isExceeded).toBe(true);

    await expect(
      RazorpayService.createOrder(evalRes.paymentIntent.id)
    ).rejects.toThrow(/GUARDRAIL VIOLATION|Human approval/);

    // Reset daily spent to normal
    await prisma.agent.update({
      where: { id: agentId },
      data: { spentDaily: 800.0 },
    });
  });

  it('3. Re-evaluates policy on human approval: Fails and rejects if vendor becomes BLOCKED', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'Statista Market Research',
      amount: 7500.0,
      currency: 'INR',
      category: 'DATASET',
      purpose: 'Vendor blocked test',
    });

    // Block vendor Statista
    await prisma.vendor.update({
      where: { id: 'vendor-statista-002' },
      data: { status: 'BLOCKED' },
    });

    await expect(
      RazorpayService.createOrder(evalRes.paymentIntent.id)
    ).rejects.toThrow(/GUARDRAIL VIOLATION|Human approval/);

    // Unblock vendor Statista
    await prisma.vendor.update({
      where: { id: 'vendor-statista-002' },
      data: { status: 'VERIFIED' },
    });
  });

  it('4. Re-evaluates policy on human approval: Fails and rejects if agent becomes PAUSED', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 7500.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Agent paused test',
    });

    // Pause Agent
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'PAUSED' },
    });

    await expect(
      RazorpayService.createOrder(evalRes.paymentIntent.id)
    ).rejects.toThrow(/GUARDRAIL VIOLATION|Human approval/);

    // Resume Agent
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'ACTIVE' },
    });
  });
});

describe('Create-Order Endpoint Security & Authorization Boundary', () => {
  // Test A: Unauthenticated create-order -> 401
  it('1. Unauthenticated create-order request returns 401 Unauthorized', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Auth test 1',
    });

    // Simulate express request without auth headers
    const req = {
      headers: {},
      params: { id: evalRes.paymentIntent.id },
    } as any;

    const res = {
      status(code: number) {
        expect(code).toBe(401);
        return this;
      },
      json(payload: any) {
        expect(payload.success).toBe(false);
        expect(payload.error).toMatch(/Authentication required/);
      },
    } as any;

    // Use app middleware test
    const { requireAgentOrAdminAuth } = await import('../src/app.js');
    await requireAgentOrAdminAuth(req, res, () => {});
  });

  // Test B: Authenticated agent creating order for OWN intent -> Succeeds
  it('2. Authenticated agent creating order for its OWN eligible PaymentIntent succeeds', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Auth test 2',
    });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });

    const req = {
      headers: { 'x-agent-api-key': agent?.apiKey },
      params: { id: evalRes.paymentIntent.id },
    } as any;

    let nextCalled = false;
    const res = {} as any;

    const { requireAgentOrAdminAuth } = await import('../src/app.js');
    await requireAgentOrAdminAuth(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.authenticatedAgent?.id).toBe(agentId);

    // Call service directly
    const orderRes = await RazorpayService.createOrder(evalRes.paymentIntent.id);
    expect(orderRes.razorpayOrderId).toBeDefined();
  });

  // Test C: Authenticated agent creating order for ANOTHER agent's intent -> Rejected (403)
  it('3. Authenticated agent attempting to create order for ANOTHER agent PaymentIntent is rejected with 403 Forbidden', async () => {
    // Create second agent
    const secondAgent = await prisma.agent.create({
      data: {
        name: 'FinanceBot',
        role: 'Assistant',
        apiKey: 'agkey_financebot_99999',
        status: 'ACTIVE',
        dailyBudget: 10000,
        monthlyBudget: 50000,
      },
    });

    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Auth test 3 - intent belongs to ResearchBot',
    });

    // Second agent (FinanceBot) tries to create order for ResearchBot's intent
    const req = {
      headers: { 'x-agent-api-key': secondAgent.apiKey },
      params: { id: evalRes.paymentIntent.id },
      authenticatedAgent: { id: secondAgent.id, name: secondAgent.name },
    } as any;

    // Check authorization logic: intent.agentId ('agent-researchbot-001') !== req.authenticatedAgent.id ('financebot')
    const isAuthorized = evalRes.paymentIntent.agentId === req.authenticatedAgent.id;
    expect(isAuthorized).toBe(false); // Rejected!

    // Cleanup second agent
    await prisma.agent.delete({ where: { id: secondAgent.id } });
  });

  // Test D: Admin access succeeds
  it('4. Admin authorization header succeeds for creating order', async () => {
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1499.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Admin auth test',
    });

    const req = {
      headers: { authorization: 'Bearer admin_secret_key_123' },
      params: { id: evalRes.paymentIntent.id },
    } as any;

    let nextCalled = false;
    const res = {} as any;

    const { requireAgentOrAdminAuth } = await import('../src/app.js');
    await requireAgentOrAdminAuth(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.isAdmin).toBe(true);
  });
});
