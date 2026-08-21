export type PolicyDecision = 'ALLOW' | 'BLOCK' | 'REQUIRE_HUMAN_APPROVAL';

export interface AgentContext {
  id: string;
  name: string;
  role: string;
  status: string;
  dailyBudget: number;
  monthlyBudget: number;
  perTxLimit: number;
  spentDaily: number;
  spentMonthly: number;
}

export interface AgentPolicyContext {
  id: string;
  agentId: string;
  autoApproveLimit: number;
  humanApprovalThreshold: number;
  allowedCategories: string[];
  blockedCategories: string[];
  allowedVendorIds: string[];
  requireVendorVerification: boolean;
  isActive: boolean;
}

export interface VendorContext {
  id: string;
  name: string;
  domain: string;
  category: string;
  status: string;
  razorpayAccountId?: string | null;
}

export interface PaymentIntentInput {
  rawVendorName: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
}

export interface EvaluationInput {
  agent: AgentContext;
  policy: AgentPolicyContext;
  vendor?: VendorContext | null;
  paymentIntent: PaymentIntentInput;
}

export interface EvaluationSnapshot {
  agentId: string;
  amount: number;
  currency: string;
  vendorId?: string | null;
  vendorName: string;
  category: string;
  dailyBudget: number;
  spentDaily: number;
  dailyBudgetRemaining: number;
  monthlyBudget: number;
  spentMonthly: number;
  monthlyBudgetRemaining: number;
}

export interface EvaluationResult {
  decision: PolicyDecision;
  approved: boolean;
  requiresHumanReview: boolean;
  reason: string;
  ruleTriggered: string;
  evalSnapshot: EvaluationSnapshot;
}
