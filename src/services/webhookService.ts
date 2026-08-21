import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WebhookService {
  /**
   * Verifies Razorpay Webhook HMAC-SHA256 signature.
   */
  public static verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const generatedSignature = hmac.digest('hex');

      const sigBuffer = Buffer.from(signature, 'utf8');
      const genBuffer = Buffer.from(generatedSignature, 'utf8');

      if (sigBuffer.length !== genBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, genBuffer);
    } catch (err) {
      console.error('Webhook signature verification error:', err);
      return false;
    }
  }

  /**
   * Processes verified Razorpay webhook payload and updates ledger & agent budgets atomically.
   */
  public static async handleWebhookEvent(eventPayload: any) {
    const eventType = eventPayload.event;
    const payloadEntity = eventPayload.payload?.payment?.entity || eventPayload.payload?.order?.entity;

    if (!payloadEntity) {
      return { status: 'ignored', reason: 'Missing payment/order entity in payload.' };
    }

    const razorpayOrderId = payloadEntity.order_id;
    const razorpayPaymentId = payloadEntity.id;

    if (!razorpayOrderId) {
      return { status: 'ignored', reason: 'Missing razorpayOrderId in webhook payload.' };
    }

    // Find PaymentIntent matching order_id
    const intent = await prisma.paymentIntent.findFirst({
      where: { razorpayOrderId },
      include: { agent: true },
    });

    if (!intent) {
      return {
        status: 'not_found',
        reason: `No PaymentIntent found for Razorpay Order ID "${razorpayOrderId}".`,
      };
    }

    // Handle payment capture / order completion
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      // Idempotency Check: Ignore if already completed
      if (intent.status === 'COMPLETED') {
        return {
          status: 'already_processed',
          paymentIntentId: intent.id,
          reason: `PaymentIntent ${intent.id} is already marked as COMPLETED. Skipping duplicate event.`,
        };
      }

      const amountPaid = payloadEntity.amount ? payloadEntity.amount / 100 : intent.amount;

      // 1. Update PaymentIntent status
      const updatedIntent = await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId,
        },
      });

      // 2. Atomically update Agent's daily & monthly spent totals
      await prisma.agent.update({
        where: { id: intent.agentId },
        data: {
          spentDaily: { increment: amountPaid },
          spentMonthly: { increment: amountPaid },
        },
      });

      // 3. Log Immutable Audit Event
      const auditEvent = await prisma.auditEvent.create({
        data: {
          paymentIntentId: intent.id,
          agentId: intent.agentId,
          eventType: 'PAYMENT_SUCCESS',
          decision: intent.decision,
          reason: `Razorpay payment captured successfully. Payment ID: ${razorpayPaymentId}. Amount: ${intent.currency} ${amountPaid}.`,
          metadata: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId,
            amountPaid,
            currency: intent.currency,
            vendorId: intent.vendorId,
            category: intent.category,
            method: payloadEntity.method || 'unknown',
            email: payloadEntity.email || null,
          }),
        },
      });

      return {
        status: 'completed',
        paymentIntent: updatedIntent,
        auditEvent,
      };
    }

    // Handle payment failure
    if (eventType === 'payment.failed') {
      if (intent.status === 'FAILED') {
        return { status: 'already_processed', paymentIntentId: intent.id };
      }

      const updatedIntent = await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: 'FAILED',
          razorpayPaymentId: razorpayPaymentId || null,
        },
      });

      const auditEvent = await prisma.auditEvent.create({
        data: {
          paymentIntentId: intent.id,
          agentId: intent.agentId,
          eventType: 'PAYMENT_FAILED',
          decision: intent.decision,
          reason: `Razorpay payment failed. Reason: ${payloadEntity.error_description || 'Transaction error'}.`,
          metadata: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId,
            errorCode: payloadEntity.error_code,
            errorDescription: payloadEntity.error_description,
          }),
        },
      });

      return {
        status: 'failed',
        paymentIntent: updatedIntent,
        auditEvent,
      };
    }

    return { status: 'unhandled_event', eventType };
  }
}
