import {
  EvaluationInput,
  EvaluationResult,
  PolicyDecision,
  EvaluationSnapshot,
} from './types.js';

/**
 * Deterministic Financial Policy Engine for AgentPay.
 * 
 * Rules are evaluated in strict priority order.
 * The LLM NEVER directly authorizes payments.
 * Returns ALLOW, BLOCK, or REQUIRE_HUMAN_APPROVAL.
 */
export class PolicyEngine {
  public static evaluate(input: EvaluationInput): EvaluationResult {
    const { agent, policy, vendor, paymentIntent } = input;

    const dailyRemaining = Math.max(0, agent.dailyBudget - agent.spentDaily);
    const monthlyRemaining = Math.max(0, agent.monthlyBudget - agent.spentMonthly);

    const snapshot: EvaluationSnapshot = {
      agentId: agent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      vendorId: vendor ? vendor.id : null,
      vendorName: vendor ? vendor.name : paymentIntent.rawVendorName,
      category: paymentIntent.category,
      dailyBudget: agent.dailyBudget,
      spentDaily: agent.spentDaily,
      dailyBudgetRemaining: dailyRemaining,
      monthlyBudget: agent.monthlyBudget,
      spentMonthly: agent.spentMonthly,
      monthlyBudgetRemaining: monthlyRemaining,
    };

    const makeResult = (
      decision: PolicyDecision,
      reason: string,
      ruleTriggered: string
    ): EvaluationResult => ({
      decision,
      approved: decision === 'ALLOW',
      requiresHumanReview: decision === 'REQUIRE_HUMAN_APPROVAL',
      reason,
      ruleTriggered,
      evalSnapshot: snapshot,
    });

    // Rule 1: Agent Status Check
    if (agent.status !== 'ACTIVE') {
      return makeResult(
        'BLOCK',
        `Agent "${agent.name}" is currently ${agent.status.toLowerCase()} and cannot execute transactions.`,
        'AGENT_INACTIVE'
      );
    }

    // Rule 2: Policy Active Check
    if (!policy.isActive) {
      return makeResult(
        'BLOCK',
        `Financial policy for Agent "${agent.name}" is inactive.`,
        'POLICY_INACTIVE'
      );
    }

    // Rule 3: Vendor Existence Check (Unknown Vendor)
    if (!vendor) {
      return makeResult(
        'BLOCK',
        `Unknown vendor "${paymentIntent.rawVendorName}". Vendor is not registered in the trusted database.`,
        'UNKNOWN_VENDOR'
      );
    }

    // Rule 4: Vendor Block Status Check
    if (vendor.status === 'BLOCKED') {
      return makeResult(
        'BLOCK',
        `Vendor "${vendor.name}" (${vendor.domain}) is explicitly blocked.`,
        'VENDOR_BLOCKED'
      );
    }

    // Rule 5: Vendor Verification Check
    if (policy.requireVendorVerification && vendor.status !== 'VERIFIED') {
      return makeResult(
        'BLOCK',
        `Vendor "${vendor.name}" status is ${vendor.status}. Policy requires verified vendors.`,
        'VENDOR_UNVERIFIED'
      );
    }

    // Rule 6: Allowed Vendor List Check
    if (
      policy.allowedVendorIds &&
      policy.allowedVendorIds.length > 0 &&
      !policy.allowedVendorIds.includes(vendor.id)
    ) {
      return makeResult(
        'BLOCK',
        `Vendor "${vendor.name}" (ID: ${vendor.id}) is not present in the agent's allowed vendor whitelist.`,
        'VENDOR_NOT_WHITELISTED'
      );
    }

    // Rule 7: Blocked Category Check
    if (
      policy.blockedCategories &&
      policy.blockedCategories.includes(paymentIntent.category)
    ) {
      return makeResult(
        'BLOCK',
        `Category "${paymentIntent.category}" is explicitly blocked by policy.`,
        'BLOCKED_CATEGORY'
      );
    }

    // Rule 8: Allowed Category Check
    if (
      policy.allowedCategories &&
      policy.allowedCategories.length > 0 &&
      !policy.allowedCategories.includes(paymentIntent.category)
    ) {
      return makeResult(
        'BLOCK',
        `Category "${paymentIntent.category}" is not in the allowed category list for this agent.`,
        'CATEGORY_NOT_ALLOWED'
      );
    }

    // Rule 9: Single Transaction Limit Check
    if (paymentIntent.amount > agent.perTxLimit) {
      return makeResult(
        'BLOCK',
        `Payment amount (${paymentIntent.currency} ${paymentIntent.amount}) exceeds single transaction limit of ${agent.perTxLimit}.`,
        'PER_TX_LIMIT_EXCEEDED'
      );
    }

    // Rule 10: Daily Budget Check
    if (agent.spentDaily + paymentIntent.amount > agent.dailyBudget) {
      return makeResult(
        'BLOCK',
        `Insufficient budget: Transaction amount (${paymentIntent.currency} ${paymentIntent.amount}) + daily spent (${agent.spentDaily}) exceeds daily budget limit (${agent.dailyBudget}).`,
        'DAILY_BUDGET_EXCEEDED'
      );
    }

    // Rule 11: Monthly Budget Check
    if (agent.spentMonthly + paymentIntent.amount > agent.monthlyBudget) {
      return makeResult(
        'BLOCK',
        `Insufficient budget: Transaction amount (${paymentIntent.currency} ${paymentIntent.amount}) + monthly spent (${agent.spentMonthly}) exceeds monthly budget limit (${agent.monthlyBudget}).`,
        'MONTHLY_BUDGET_EXCEEDED'
      );
    }

    // Rule 12: Amount Threshold Evaluation (ALLOW vs REQUIRE_HUMAN_APPROVAL)
    if (paymentIntent.amount <= policy.autoApproveLimit) {
      return makeResult(
        'ALLOW',
        `Transaction amount (${paymentIntent.currency} ${paymentIntent.amount}) is within auto-approval threshold (${policy.autoApproveLimit}).`,
        'AUTO_APPROVED'
      );
    }

    if (
      paymentIntent.amount > policy.autoApproveLimit &&
      paymentIntent.amount <= policy.humanApprovalThreshold
    ) {
      return makeResult(
        'REQUIRE_HUMAN_APPROVAL',
        `Transaction amount (${paymentIntent.currency} ${paymentIntent.amount}) exceeds auto-approval threshold (${policy.autoApproveLimit}) but is within human approval threshold (${policy.humanApprovalThreshold}). Requires human sign-off.`,
        'HUMAN_APPROVAL_REQUIRED'
      );
    }

    return makeResult(
      'BLOCK',
      `Transaction amount (${paymentIntent.currency} ${paymentIntent.amount}) exceeds maximum human approval threshold (${policy.humanApprovalThreshold}).`,
      'EXCEEDS_HUMAN_THRESHOLD'
    );
  }
}
