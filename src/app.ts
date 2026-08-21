import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PaymentIntentService } from './services/paymentIntentService.js';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'AgentPay Guardrail Engine',
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
    const { agentId, rawVendorName, amount, currency, category, purpose } = req.body;

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
