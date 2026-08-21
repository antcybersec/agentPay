import { AgentPaymentRequestSchema } from './paymentSchema.js';
import { RequestPaymentInput, RequestPaymentOutput, NextAction } from './agentTypes.js';
import { PaymentIntentService } from '../services/paymentIntentService.js';
import { RazorpayService } from '../services/razorpayService.js';

export class PaymentTool {
  /**
   * Financial Tool: request_payment({ vendor, amount, currency, category, purpose, idempotencyKey })
   * 
   * THE AGENT IS UNTRUSTED:
   * 1. Validates input via strict Zod schema (rejecting malicious properties).
   * 2. Evaluates intent deterministically using server-bound agent ID.
   * 3. If ALLOW -> Proceed to Razorpay order creation.
   * 4. Returns structured decision & nextAction to agent.
   */
  public static async execute(
    authenticatedAgentId: string,
    rawInput: any
  ): Promise<RequestPaymentOutput> {
    // 1. Zod Input Sanitization & Validation
    const validatedInput = AgentPaymentRequestSchema.parse(rawInput);

    // 2. Execute Policy Engine & Create Intent
    const evalResult = await PaymentIntentService.evaluateAndCreateIntent(
      authenticatedAgentId,
      {
        rawVendorName: validatedInput.vendor,
        amount: validatedInput.amount,
        currency: validatedInput.currency || 'INR',
        category: validatedInput.category,
        purpose: validatedInput.purpose,
        idempotencyKey: validatedInput.idempotencyKey,
      }
    );

    const { paymentIntent, evaluation } = evalResult;
    let nextAction: NextAction = 'CANCEL_TRANSACTION';
    let razorpayOrderId: string | null = null;

    // 3. Deterministic Decision Handling
    if (evaluation.decision === 'ALLOW') {
      nextAction = 'PROCEED_TO_CHECKOUT';
      // Automatically trigger order creation for allowed intent
      const orderRes = await RazorpayService.createOrder(paymentIntent.id);
      razorpayOrderId = orderRes.razorpayOrderId;
    } else if (evaluation.decision === 'REQUIRE_HUMAN_APPROVAL') {
      nextAction = 'AWAIT_HUMAN_APPROVAL';
    } else if (evaluation.decision === 'BLOCK') {
      nextAction = 'CANCEL_TRANSACTION';
    }

    // 4. Return Tool Output Contract
    return {
      paymentIntentId: paymentIntent.id,
      decision: evaluation.decision,
      status: (razorpayOrderId ? 'ORDER_CREATED' : paymentIntent.status) as any,
      reason: evaluation.reason,
      ruleTriggered: evaluation.ruleTriggered,
      razorpayOrderId,
      nextAction,
      evalSnapshot: {
        agentId: authenticatedAgentId,
        amount: evaluation.evalSnapshot.amount,
        currency: evaluation.evalSnapshot.currency,
        category: evaluation.evalSnapshot.category,
        dailyBudgetRemaining: evaluation.evalSnapshot.dailyBudgetRemaining,
        monthlyBudgetRemaining: evaluation.evalSnapshot.monthlyBudgetRemaining,
      },
    };
  }
}
