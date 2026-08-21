export interface RequestPaymentInput {
  vendor: string;
  amount: number;
  currency?: string;
  category: string;
  purpose: string;
  idempotencyKey?: string;
}

export type NextAction = 'PROCEED_TO_CHECKOUT' | 'AWAIT_HUMAN_APPROVAL' | 'CANCEL_TRANSACTION';

export interface RequestPaymentOutput {
  paymentIntentId: string;
  decision: 'ALLOW' | 'REQUIRE_HUMAN_APPROVAL' | 'BLOCK';
  status: 'APPROVED' | 'PENDING_HUMAN_APPROVAL' | 'REJECTED' | 'ORDER_CREATED';
  reason: string;
  ruleTriggered: string;
  razorpayOrderId?: string | null;
  nextAction: NextAction;
  evalSnapshot: {
    agentId: string;
    amount: number;
    currency: string;
    category: string;
    dailyBudgetRemaining: number;
    monthlyBudgetRemaining: number;
  };
}

export interface AgentScenarioInput {
  scenario: 'A' | 'B' | 'C' | 'ALLOW' | 'HUMAN_APPROVAL' | 'BLOCK';
  prompt?: string;
  customAmount?: number;
  customVendor?: string;
}

export interface AgentScenarioResult {
  scenario: string;
  userPrompt: string;
  agentThought: string;
  proposedPayment: RequestPaymentInput;
  toolOutput: RequestPaymentOutput;
}
