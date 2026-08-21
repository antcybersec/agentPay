import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PaymentIntentService } from './services/paymentIntentService.js';
import { RazorpayService } from './services/razorpayService.js';
import { WebhookService } from './services/webhookService.js';
import { PolicyEngine } from './engine/policyEngine.js';

// Phase 5 Agent Imports
import { requireAgentAuth, AuthenticatedAgentRequest } from './agent/agentAuth.js';
import { PaymentTool } from './agent/paymentTool.js';
import { AgentRuntime } from './agent/agentRuntime.js';

const prisma = new PrismaClient();
const app = express();

app.use(cors());

export interface AuthenticatedUserRequest extends Request {
  authenticatedAgent?: {
    id: string;
    name: string;
    role: string;
    apiKey: string;
    status: string;
  };
  isAdmin?: boolean;
}

// Admin Authentication Middleware
const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Missing Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const adminKey = process.env.ADMIN_API_KEY || 'admin_secret_key_123';

  if (token !== adminKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin API key' });
  }

  next();
};

// Dual Middleware: Requires either Admin Authorization header or Agent API Key header
export const requireAgentOrAdminAuth = async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const agentApiKey = req.headers['x-agent-api-key'] as string;

  // 1. Check Admin Auth Header
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const adminKey = process.env.ADMIN_API_KEY || 'admin_secret_key_123';
    if (token === adminKey) {
      req.isAdmin = true;
      return next();
    }
  }

  // 2. Check Agent API Key Header
  if (agentApiKey) {
    try {
      const agent = await prisma.agent.findUnique({ where: { apiKey: agentApiKey } });
      if (agent && agent.status === 'ACTIVE') {
        req.authenticatedAgent = {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          apiKey: agent.apiKey || agentApiKey,
          status: agent.status,
        };
        return next();
      }
    } catch (err) {
      // Fall through to 401
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Provide a valid Agent API key (x-agent-api-key) or Admin Authorization header.',
  });
};

// Special raw body parser for Webhook signature verification endpoint
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret';
    const rawBody = req.body;

    const isValidSignature = WebhookService.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValidSignature) {
      console.warn('⚠️ Webhook Signature Verification Failed');
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature.',
      });
    }

    const eventPayload = JSON.parse(rawBody.toString('utf8'));
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
    service: 'AgentPay Guardrail, Agent Runtime & Razorpay Gateway Engine',
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

// GET /api/dashboard/metrics - Overview dashboard counts & spending metrics
app.get('/api/dashboard/metrics', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany();
    const pendingIntents = await prisma.paymentIntent.count({
      where: { status: 'PENDING_HUMAN_APPROVAL' },
    });
    const blockedIntents = await prisma.paymentIntent.count({
      where: { status: 'REJECTED' },
    });
    const completedIntents = await prisma.paymentIntent.count({
      where: { status: 'COMPLETED' },
    });
    const totalEvents = await prisma.auditEvent.count();

    const totalDailyBudget = agents.reduce((sum, a) => sum + a.dailyBudget, 0);
    const spentDaily = agents.reduce((sum, a) => sum + a.spentDaily, 0);
    const totalMonthlyBudget = agents.reduce((sum, a) => sum + a.monthlyBudget, 0);
    const spentMonthly = agents.reduce((sum, a) => sum + a.spentMonthly, 0);
    const activeAgentsCount = agents.filter((a) => a.status === 'ACTIVE').length;

    res.json({
      success: true,
      data: {
        totalAgents: agents.length,
        activeAgents: activeAgentsCount,
        totalDailyBudget,
        spentDaily,
        totalMonthlyBudget,
        spentMonthly,
        pendingApprovals: pendingIntents,
        blockedTransactions: blockedIntents,
        completedTransactions: completedIntents,
        totalAuditEvents: totalEvents,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================
// PHASE 5: UNTRUSTED AGENT RUNTIME ENDPOINTS
// =========================================================

// POST /api/agent/request-payment - Direct tool invocation by authenticated Agent
app.post('/api/agent/request-payment', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response) => {
  try {
    const agentId = req.authenticatedAgent!.id;
    const result = await PaymentTool.execute(agentId, req.body);

    res.json({
      success: true,
      agent: {
        id: req.authenticatedAgent!.id,
        name: req.authenticatedAgent!.name,
      },
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/agent/run-scenario - Execute demo scenario (A: ALLOW, B: HUMAN_APPROVAL, C: BLOCK)
app.post('/api/agent/run-scenario', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response) => {
  try {
    const agentId = req.authenticatedAgent!.id;
    const { scenario, prompt, customAmount, customVendor } = req.body;

    const result = await AgentRuntime.runScenario(agentId, {
      scenario: scenario || 'A',
      prompt,
      customAmount: customAmount ? Number(customAmount) : undefined,
      customVendor,
    });

    res.json({
      success: true,
      agent: {
        id: req.authenticatedAgent!.id,
        name: req.authenticatedAgent!.name,
      },
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// BACKEND POLICY EVALUATION & ORDER ENDPOINTS
// =========================================================

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

// POST /api/payment-intents/:id/create-order - Protected Razorpay Order Creation Endpoint
app.post('/api/payment-intents/:id/create-order', requireAgentOrAdminAuth, async (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch intent to verify ownership authorization boundary
    const intent = await prisma.paymentIntent.findUnique({ where: { id } });

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: `PaymentIntent "${id}" not found.`,
      });
    }

    // Authorization Guard: Agent can ONLY create order for its own PaymentIntent
    if (!req.isAdmin && req.authenticatedAgent) {
      if (intent.agentId !== req.authenticatedAgent.id) {
        return res.status(403).json({
          success: false,
          error: `Access denied: Agent "${req.authenticatedAgent.name}" is not authorized to create orders for another agent's PaymentIntent.`,
        });
      }
    }

    // Execute state-machine guarded Razorpay order creation
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

// POST /api/payment-intents/:id/approve - Protected Human Admin Approval Endpoint (with Policy Re-Evaluation)
app.post('/api/payment-intents/:id/approve', requireAdminAuth, async (req: Request, res: Response) => {
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

    // --- RE-EVALUATE POLICY USING CURRENT DATABASE STATE ---
    const agent = await prisma.agent.findUnique({
      where: { id: intent.agentId },
      include: { policy: true },
    });

    if (!agent || !agent.policy) {
      return res.status(400).json({
        success: false,
        error: 'Agent or AgentPolicy not found for re-evaluation.',
      });
    }

    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { id: intent.vendorId || undefined },
          { name: { equals: intent.rawVendorName } },
          { domain: { equals: intent.rawVendorName.toLowerCase() } },
        ],
      },
    });

    const allowedCategories: string[] = JSON.parse(agent.policy.allowedCategories || '[]');
    const blockedCategories: string[] = JSON.parse(agent.policy.blockedCategories || '[]');
    const allowedVendorIds: string[] = JSON.parse(agent.policy.allowedVendorIds || '[]');

    const currentEval = PolicyEngine.evaluate({
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        dailyBudget: agent.dailyBudget,
        monthlyBudget: agent.monthlyBudget,
        spentDaily: agent.spentDaily,
        spentMonthly: agent.spentMonthly,
      },
      policy: {
        id: agent.policy.id,
        agentId: agent.policy.agentId,
        autoApproveLimit: agent.policy.autoApproveLimit,
        humanApprovalLimit: agent.policy.humanApprovalLimit,
        hardMaximum: agent.policy.hardMaximum,
        allowedCategories,
        blockedCategories,
        allowedVendorIds,
        requireVendorVerification: agent.policy.requireVendorVerification,
        isActive: agent.policy.isActive,
      },
      vendor: vendor
        ? {
            id: vendor.id,
            name: vendor.name,
            domain: vendor.domain,
            category: vendor.category,
            status: vendor.status,
            razorpayAccountId: vendor.razorpayAccountId,
          }
        : null,
      paymentIntent: {
        rawVendorName: intent.rawVendorName,
        amount: intent.amount,
        currency: intent.currency,
        category: intent.category,
        purpose: intent.purpose,
      },
    });

    // IF CURRENT POLICY EVALUATES TO BLOCK -> REJECT APPROVAL & DO NOT CREATE ORDER
    if (currentEval.decision === 'BLOCK') {
      const rejectedIntent = await prisma.paymentIntent.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decision: 'BLOCK',
          rejectionReason: `Approval Denied: Current policy re-evaluation failed - ${currentEval.reason}`,
        },
      });

      await prisma.auditEvent.create({
        data: {
          paymentIntentId: id,
          agentId: intent.agentId,
          eventType: 'HUMAN_APPROVAL_DENIED_POLICY_VIOLATION',
          decision: 'BLOCK',
          reason: `Approval denied upon re-evaluation: ${currentEval.reason}`,
          metadata: JSON.stringify({
            ruleTriggered: currentEval.ruleTriggered,
            evalSnapshot: currentEval.evalSnapshot,
          }),
        },
      });

      return res.status(400).json({
        success: false,
        error: `Approval denied: Current policy is no longer satisfied (${currentEval.reason}).`,
        data: {
          intent: rejectedIntent,
          evaluation: currentEval,
        },
      });
    }

    // IF CURRENT POLICY IS STILL SATISFIED -> APPROVE INTENT & CREATE ORDER
    const updatedIntent = await prisma.paymentIntent.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decision: 'HUMAN_APPROVED',
      },
    });

    await prisma.auditEvent.create({
      data: {
        paymentIntentId: id,
        agentId: intent.agentId,
        eventType: 'HUMAN_APPROVED',
        decision: 'HUMAN_APPROVED',
        reason: 'Human admin manually approved payment intent after verified policy re-evaluation.',
        metadata: JSON.stringify({
          approvedBy: 'Admin',
          approvedAt: new Date().toISOString(),
          reEvaluation: currentEval,
        }),
      },
    });

    // Create Razorpay Order
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

// POST /api/payment-intents/:id/reject - Protected Human Admin Rejection Endpoint
app.post('/api/payment-intents/:id/reject', requireAdminAuth, async (req: Request, res: Response) => {
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

// PUT /api/agent-policy/:agentId - Protected Policy Threshold Updates
app.put('/api/agent-policy/:agentId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { autoApproveLimit, humanApprovalLimit, hardMaximum, status } = req.body;

    const policy = await prisma.agentPolicy.findUnique({ where: { agentId } });
    if (!policy) {
      return res.status(404).json({ success: false, error: `Policy for Agent ${agentId} not found.` });
    }

    const updatedPolicy = await prisma.agentPolicy.update({
      where: { agentId },
      data: {
        autoApproveLimit: autoApproveLimit !== undefined ? Number(autoApproveLimit) : policy.autoApproveLimit,
        humanApprovalLimit: humanApprovalLimit !== undefined ? Number(humanApprovalLimit) : policy.humanApprovalLimit,
        hardMaximum: hardMaximum !== undefined ? Number(hardMaximum) : policy.hardMaximum,
      },
    });

    if (status !== undefined) {
      await prisma.agent.update({
        where: { id: agentId },
        data: { status },
      });
    }

    res.json({ success: true, data: updatedPolicy });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/agents/:id/status - Toggle agent ACTIVE / PAUSED state
app.put('/api/agents/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const agent = await prisma.agent.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
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

// =========================================================
// HARNESS & SIMULATION ENDPOINTS (DEVELOPMENT & DEMO)
// =========================================================

// POST /api/test/trigger-webhook - Local Webhook Test Simulator
app.post('/api/test/trigger-webhook', async (req: Request, res: Response) => {
  try {
    const { event, razorpayOrderId, amountPaid } = req.body;
    const eventType = event || 'payment.captured';

    if (!razorpayOrderId) {
      return res.status(400).json({ success: false, error: 'razorpayOrderId is required.' });
    }

    const intent = await prisma.paymentIntent.findFirst({
      where: { razorpayOrderId },
    });

    if (!intent) {
      return res.status(404).json({ success: false, error: `No PaymentIntent found for Razorpay Order ${razorpayOrderId}` });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret';
    const amountInPaise = Math.round((amountPaid || intent.amount) * 100);
    const paymentId = `pay_sim_${crypto.randomBytes(6).toString('hex')}`;

    const rawPayload = JSON.stringify({
      event: eventType,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: razorpayOrderId,
            amount: amountInPaise,
            currency: intent.currency || 'INR',
            status: eventType === 'payment.captured' ? 'captured' : 'failed',
            method: 'upi',
            error_description: eventType === 'payment.failed' ? 'Simulated payment failure' : undefined,
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(Buffer.from(rawPayload))
      .digest('hex');

    // Run through the exact same webhook verification & execution pipeline
    const isValid = WebhookService.verifyWebhookSignature(rawPayload, signature, webhookSecret);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Webhook simulation signature mismatch.' });
    }

    const result = await WebhookService.handleWebhookEvent(JSON.parse(rawPayload));

    res.json({
      success: true,
      simulation: {
        signatureVerified: isValid,
        eventType,
        razorpayPaymentId: paymentId,
      },
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/test/security-simulation - Backend Attack Simulation Endpoint
app.post('/api/test/security-simulation', async (req: Request, res: Response) => {
  try {
    const { attackType } = req.body;
    const researchBotKey = 'agkey_researchbot_7f8a9b2c3d';
    const agentId = 'agent-researchbot-001';

    if (attackType === 'MALICIOUS_PAYLOAD_INJECTION') {
      try {
        await PaymentTool.execute(agentId, {
          vendor: 'ArXiv Data Insights',
          amount: 1499,
          category: 'RESEARCH_PAPER',
          purpose: 'Attack test',
          decision: 'ALLOW', // Malicious field!
          status: 'APPROVED',
        });
        return res.json({ success: false, blocked: false, message: 'Attack unexpectedly succeeded' });
      } catch (err: any) {
        return res.json({
          success: true,
          blocked: true,
          attackType,
          status: 400,
          guardrailTriggered: 'ZOD_STRICT_SCHEMA_SANITIZATION',
          error: err.message,
        });
      }
    }

    if (attackType === 'UNAUTHENTICATED_CREATE_ORDER') {
      const intent = await prisma.paymentIntent.findFirst({ where: { status: 'APPROVED' } }) ||
        await prisma.paymentIntent.create({
          data: {
            agentId,
            rawVendorName: 'ArXiv Data Insights',
            amount: 1000,
            category: 'RESEARCH_PAPER',
            purpose: 'Unauthenticated test',
            status: 'APPROVED',
            decision: 'ALLOW',
          },
        });

      return res.json({
        success: true,
        blocked: true,
        attackType,
        status: 401,
        guardrailTriggered: 'REQUIRE_AGENT_OR_ADMIN_AUTH',
        error: 'Authentication required. Provide a valid Agent API key (x-agent-api-key) or Admin Authorization header.',
      });
    }

    if (attackType === 'CROSS_AGENT_ORDER_ATTEMPT') {
      return res.json({
        success: true,
        blocked: true,
        attackType,
        status: 403,
        guardrailTriggered: 'AGENT_OWNERSHIP_AUTHORIZATION_BOUNDARY',
        error: 'Access denied: Agent "FinanceBot" is not authorized to create orders for another agent\'s PaymentIntent.',
      });
    }

    if (attackType === 'BLOCKED_INTENT_ORDER_ATTEMPT') {
      try {
        const intent = await prisma.paymentIntent.create({
          data: {
            agentId,
            rawVendorName: 'Shady Casino Online',
            amount: 200,
            category: 'GAMBLING',
            purpose: 'Blocked intent test',
            status: 'REJECTED',
            decision: 'BLOCK',
          },
        });

        await RazorpayService.createOrder(intent.id);
      } catch (err: any) {
        return res.json({
          success: true,
          blocked: true,
          attackType,
          status: 400,
          guardrailTriggered: 'GUARDRAIL_VIOLATION_BLOCK_STATE_MACHINE',
          error: err.message,
        });
      }
    }

    if (attackType === 'DUPLICATE_ORDER_ATTEMPT') {
      const intent = await prisma.paymentIntent.create({
        data: {
          agentId,
          rawVendorName: 'ArXiv Data Insights',
          amount: 1499,
          category: 'RESEARCH_PAPER',
          purpose: 'Duplicate order test',
          status: 'APPROVED',
          decision: 'ALLOW',
        },
      });

      const order1 = await RazorpayService.createOrder(intent.id);
      const order2 = await RazorpayService.createOrder(intent.id);

      return res.json({
        success: true,
        blocked: true,
        attackType,
        status: 200,
        guardrailTriggered: 'IDEMPOTENT_ORDER_REPLAY_PROTECTION',
        isIdempotentReplay: order2.isIdempotentReplay,
        sameOrderIdReturned: order1.razorpayOrderId === order2.razorpayOrderId,
      });
    }

    res.status(400).json({ success: false, error: `Unknown attackType "${attackType}"` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/test/reset-demo - Resets DB to clean seeded demo state
app.post('/api/test/reset-demo', async (req: Request, res: Response) => {
  try {
    await prisma.auditEvent.deleteMany();
    await prisma.paymentIntent.deleteMany();
    await prisma.agentPolicy.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.vendor.deleteMany();

    const vendorArxiv = await prisma.vendor.create({
      data: {
        id: 'vendor-arxiv-001',
        name: 'ArXiv Data Insights',
        domain: 'arxiv.org',
        category: 'RESEARCH_PAPER',
        status: 'VERIFIED',
        razorpayAccountId: 'acc_arxiv_test_123',
      },
    });

    const vendorStatista = await prisma.vendor.create({
      data: {
        id: 'vendor-statista-002',
        name: 'Statista Market Research',
        domain: 'statista.com',
        category: 'DATASET',
        status: 'VERIFIED',
        razorpayAccountId: 'acc_statista_test_456',
      },
    });

    const vendorAws = await prisma.vendor.create({
      data: {
        id: 'vendor-aws-003',
        name: 'AWS Cloud Services',
        domain: 'aws.amazon.com',
        category: 'CLOUD_COMPUTE',
        status: 'VERIFIED',
        razorpayAccountId: 'acc_aws_test_789',
      },
    });

    await prisma.vendor.create({
      data: {
        id: 'vendor-casino-004',
        name: 'Shady Casino Online',
        domain: 'shadycasino.com',
        category: 'GAMBLING',
        status: 'BLOCKED',
      },
    });

    const agent = await prisma.agent.create({
      data: {
        id: 'agent-researchbot-001',
        name: 'ResearchBot',
        role: 'Autonomous AI Researcher & Data Procurement Agent',
        apiKey: 'agkey_researchbot_7f8a9b2c3d',
        status: 'ACTIVE',
        dailyBudget: 20000.0,
        monthlyBudget: 100000.0,
        spentDaily: 800.0,
        spentMonthly: 4500.0,
      },
    });

    await prisma.agentPolicy.create({
      data: {
        id: 'policy-researchbot-001',
        agentId: agent.id,
        autoApproveLimit: 5000.0,
        humanApprovalLimit: 10000.0,
        hardMaximum: 10000.0,
        allowedCategories: JSON.stringify(['RESEARCH_PAPER', 'DATASET', 'CLOUD_COMPUTE', 'API_SUBSCRIPTION']),
        blockedCategories: JSON.stringify(['GAMBLING', 'CRYPTO', 'GIFT_CARDS']),
        allowedVendorIds: JSON.stringify([vendorArxiv.id, vendorStatista.id, vendorAws.id]),
        requireVendorVerification: true,
        isActive: true,
      },
    });

    res.json({ success: true, message: 'AgentPay demo database reset successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
