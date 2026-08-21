import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PaymentIntentService } from '../src/services/paymentIntentService.js';
import { RazorpayService } from '../src/services/razorpayService.js';
import { WebhookService } from '../src/services/webhookService.js';

const prisma = new PrismaClient();
const agentId = 'agent-researchbot-001';

describe('Phase 4: Razorpay Integration & Guardrails', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Guardrail Protection - BLOCKED intent cannot create Razorpay Order
  it('1. STRICT GUARDRAIL: Refuses to create Razorpay Order for BLOCKED payment intent', async () => {
    // Evaluate a blocked intent (GAMBLING)
    const result = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'Shady Casino Online',
      amount: 200.0,
      currency: 'INR',
      category: 'GAMBLING',
      purpose: 'Attempting to bypass guardrail',
    });

    expect(result.evaluation.decision).toBe('BLOCK');
    expect(result.paymentIntent.status).toBe('REJECTED');

    // Attempting to force Razorpay Order creation MUST throw Guardrail Violation Error
    await expect(
      RazorpayService.createOrder(result.paymentIntent.id)
    ).rejects.toThrow(/GUARDRAIL VIOLATION/);

    // Verify status remains REJECTED and no razorpayOrderId was set
    const checkDb = await prisma.paymentIntent.findUnique({
      where: { id: result.paymentIntent.id },
    });
    expect(checkDb?.razorpayOrderId).toBeNull();
    expect(checkDb?.status).toBe('REJECTED');
  });

  // Test 2: Order Creation for ALLOWED Intent
  it('2. Creates Razorpay Order for ALLOWED payment intent', async () => {
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
    expect(orderRes.auditEvent.eventType).toBe('ORDER_CREATED');
  });

  // Test 3: Webhook Signature Verification
  it('3. Webhook HMAC-SHA256 signature verification validates correctly', () => {
    const secret = 'whsec_test_secret_12345';
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} });

    // Generate valid HMAC
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(rawBody))
      .digest('hex');

    const isValid = WebhookService.verifyWebhookSignature(rawBody, validSignature, secret);
    expect(isValid).toBe(true);

    const isInvalid = WebhookService.verifyWebhookSignature(rawBody, 'invalid_signature_hex', secret);
    expect(isInvalid).toBe(false);
  });

  // Test 4: Webhook payment.captured updates Intent status to COMPLETED & increments spent daily/monthly
  it('4. Webhook payment.captured marks PaymentIntent as COMPLETED and increments agent daily/monthly spent', async () => {
    const agentBefore = await prisma.agent.findUnique({ where: { id: agentId } });
    const initialSpentDaily = agentBefore?.spentDaily || 0;
    const initialSpentMonthly = agentBefore?.spentMonthly || 0;

    // Create intent & order
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

    // Simulate Razorpay payment.captured webhook payload
    const mockWebhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 149900, // Amount in Paise (1499.00 INR)
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

    // Verify Agent spent budget was atomically incremented by 1499
    const agentAfter = await prisma.agent.findUnique({ where: { id: agentId } });
    expect(agentAfter?.spentDaily).toBe(initialSpentDaily + 1499.0);
    expect(agentAfter?.spentMonthly).toBe(initialSpentMonthly + 1499.0);
  });

  // Test 5: Idempotent Webhook Processing
  it('5. Duplicate Webhook delivery is handled idempotently without duplicating budget increments', async () => {
    // Create intent & order
    const evalRes = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName: 'ArXiv Data Insights',
      amount: 1000.0,
      currency: 'INR',
      category: 'RESEARCH_PAPER',
      purpose: 'Idempotent webhook test',
    });

    const orderRes = await RazorpayService.createOrder(evalRes.paymentIntent.id);
    const orderId = orderRes.razorpayOrderId;
    const paymentId = `pay_duplicate_test_${Date.now()}`;

    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 100000,
            currency: 'INR',
          },
        },
      },
    };

    // First webhook call
    const call1 = await WebhookService.handleWebhookEvent(webhookPayload);
    expect(call1.status).toBe('completed');

    const agentAfterCall1 = await prisma.agent.findUnique({ where: { id: agentId } });

    // Duplicate webhook call
    const call2 = await WebhookService.handleWebhookEvent(webhookPayload);
    expect(call2.status).toBe('already_processed');

    const agentAfterCall2 = await prisma.agent.findUnique({ where: { id: agentId } });

    // Verify budget totals did NOT increase on duplicate webhook call
    expect(agentAfterCall2?.spentDaily).toBe(agentAfterCall1?.spentDaily);
    expect(agentAfterCall2?.spentMonthly).toBe(agentAfterCall1?.spentMonthly);
  });
});
