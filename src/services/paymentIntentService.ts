import { PrismaClient } from '@prisma/client';
import { PolicyEngine } from '../engine/policyEngine.js';
import { PaymentIntentInput, EvaluationResult } from '../engine/types.js';

const prisma = new PrismaClient();

export class PaymentIntentService {
  /**
   * Creates and deterministically evaluates a PaymentIntent.
   * If blocked: STOP. Does not create Razorpay order or proceed.
   */
  public static async evaluateAndCreateIntent(
    agentId: string,
    input: PaymentIntentInput
  ) {
    // 1. Fetch Agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { policy: true },
    });

    if (!agent) {
      throw new Error(`Agent with ID "${agentId}" not found.`);
    }

    if (!agent.policy) {
      throw new Error(`Agent "${agent.name}" does not have an associated financial policy.`);
    }

    // 2. Find Vendor matching rawVendorName or domain
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { name: { equals: input.rawVendorName } },
          { domain: { equals: input.rawVendorName.toLowerCase() } },
        ],
      },
    });

    // 3. Parse Policy JSON lists safely
    const allowedCategories: string[] = JSON.parse(agent.policy.allowedCategories || '[]');
    const blockedCategories: string[] = JSON.parse(agent.policy.blockedCategories || '[]');
    const allowedVendorIds: string[] = JSON.parse(agent.policy.allowedVendorIds || '[]');

    // 4. Run Deterministic Policy Engine
    const evalResult: EvaluationResult = PolicyEngine.evaluate({
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
      paymentIntent: input,
    });

    // 5. Determine PaymentIntent Status based on Engine Decision
    let status = 'EVALUATED';
    if (evalResult.decision === 'ALLOW') {
      status = 'APPROVED';
    } else if (evalResult.decision === 'REQUIRE_HUMAN_APPROVAL') {
      status = 'PENDING_HUMAN_APPROVAL';
    } else if (evalResult.decision === 'BLOCK') {
      status = 'REJECTED';
    }

    // 6. Record PaymentIntent in Database
    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        agentId: agent.id,
        vendorId: vendor ? vendor.id : null,
        rawVendorName: input.rawVendorName,
        amount: input.amount,
        currency: input.currency || 'INR',
        category: input.category,
        purpose: input.purpose,
        status,
        decision: evalResult.decision,
        rejectionReason: evalResult.decision === 'BLOCK' ? evalResult.reason : null,
      },
    });

    // 7. Record Immutable Audit Event
    const auditEvent = await prisma.auditEvent.create({
      data: {
        paymentIntentId: paymentIntent.id,
        agentId: agent.id,
        eventType: 'POLICY_EVALUATED',
        decision: evalResult.decision,
        reason: evalResult.reason,
        metadata: JSON.stringify({
          ruleTriggered: evalResult.ruleTriggered,
          evalSnapshot: evalResult.evalSnapshot,
        }),
      },
    });

    return {
      paymentIntent,
      evaluation: evalResult,
      auditEvent,
    };
  }
}
