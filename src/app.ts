import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PaymentIntentService } from './services/paymentIntentService.js';
import { RazorpayService } from './services/razorpayService.js';
import { WebhookService } from './services/webhookService.js';

const prisma = new PrismaClient();
const app = express();

app.use(cors());

// Special raw body parser for Webhook signature verification endpoint
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret';
    const rawBody = req.body; // Buffer from express.raw

    // 1. Verify HMAC Signature
    const isValidSignature = WebhookService.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValidSignature) {
      console.warn('⚠️ Webhook Signature Verification Failed');
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature.',
      });
    }

    // 2. Parse JSON payload
    const eventPayload = JSON.parse(rawBody.toString('utf8'));

    // 3. Process event
    const result = await WebhookService.handleWebhookEvent(eventPayload);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// JSON parser middleware for standard API endpoints
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'AgentPay Guardrail & Razorpay Gateway Engine',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/agents - List agents & active policies
app.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      include: { policy: true },
    });
    res.json({ success: true, data: agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vendors - List trusted vendors
app.get('/api/vendors', async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany();
    res.json({ success: true, data: vendors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payment-intents/evaluate - Evaluate a payment intent
app.post('/api/payment-intents/evaluate', async (req: Request, res: Response) => {
  try {
    const { agentId, rawVendorName, amount, currency, category, purpose, idempotencyKey } = req.body;

    if (!agentId || !rawVendorName || amount === undefined || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: agentId, rawVendorName, amount, category',
      });
    }

    const result = await PaymentIntentService.evaluateAndCreateIntent(agentId, {
      rawVendorName,
      amount: Number(amount),
      currency: currency || 'INR',
      category,
      purpose: purpose || 'Agent automated purchase',
      idempotencyKey,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/payment-intents/:id/create-order - Create Razorpay order for an approved intent
app.post('/api/payment-intents/:id/create-order', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await RazorpayService.createOrder(id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/payment-intents/:id/approve - Human Admin Approval endpoint
app.post('/api/payment-intents/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const intent = await prisma.paymentIntent.findUnique({
      where: { id },
    });

    if (!intent) {
      return res.status(404).json({ success: false, error: `PaymentIntent ${id} not found.` });
    }

    if (intent.status !== 'PENDING_HUMAN_APPROVAL') {
      return res.status(400).json({
        success: false,
        error: `PaymentIntent ${id} is in status "${intent.status}", cannot approve.`,
      });
    }

    // 1. Update intent status & decision
    const updatedIntent = await prisma.paymentIntent.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decision: 'HUMAN_APPROVED',
      },
    });

    // 2. Log Audit Event
    await prisma.auditEvent.create({
      data: {
        paymentIntentId: id,
        agentId: intent.agentId,
        eventType: 'HUMAN_APPROVED',
        decision: 'HUMAN_APPROVED',
        reason: 'Human admin manually approved payment intent.',
        metadata: JSON.stringify({ approvedBy: 'Admin', approvedAt: new Date().toISOString() }),
      },
    });

    // 3. Immediately trigger Razorpay Order creation
    const orderResult = await RazorpayService.createOrder(id);

    res.json({
      success: true,
      data: {
        intent: updatedIntent,
        order: orderResult,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payment-intents/:id/reject - Human Admin Rejection endpoint
app.post('/api/payment-intents/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const intent = await prisma.paymentIntent.findUnique({ where: { id } });

    if (!intent) {
      return res.status(404).json({ success: false, error: `PaymentIntent ${id} not found.` });
    }

    const updatedIntent = await prisma.paymentIntent.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decision: 'BLOCK',
        rejectionReason: reason || 'Rejected by Human Admin',
      },
    });

    await prisma.auditEvent.create({
      data: {
        paymentIntentId: id,
        agentId: intent.agentId,
        eventType: 'HUMAN_REJECTED',
        decision: 'BLOCK',
        reason: reason || 'Rejected by Human Admin',
        metadata: JSON.stringify({ rejectedBy: 'Admin', rejectedAt: new Date().toISOString() }),
      },
    });

    res.json({
      success: true,
      data: updatedIntent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/audit-events - Fetch audit log ledger
app.get('/api/audit-events', async (req: Request, res: Response) => {
  try {
    const events = await prisma.auditEvent.findMany({
      orderBy: { timestamp: 'desc' },
      include: { agent: true, paymentIntent: true },
    });
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
