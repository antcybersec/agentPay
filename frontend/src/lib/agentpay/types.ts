export type Decision = "ALLOW" | "REQUIRE_HUMAN_APPROVAL" | "BLOCK";

export type IntentStatus =
  | "CREATED"
  | "EVALUATED"
  | "APPROVED"
  | "REJECTED"
  | "PENDING_HUMAN_APPROVAL"
  | "ORDER_CREATED"
  | "COMPLETED"
  | "FAILED";

export interface AgentPolicy {
  id: string;
  agentId: string;
  autoApproveLimit: number;
  humanApprovalLimit: number;
  hardMaximum: number;
  allowedCategories: string;
  blockedCategories: string;
  allowedVendorIds: string;
  requireVendorVerification: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  apiKey: string;
  status: string;
  dailyBudget: number;
  monthlyBudget: number;
  spentDaily: number;
  spentMonthly: number;
  createdAt: string;
  updatedAt: string;
  policy?: AgentPolicy | null;
}

export interface Vendor {
  id: string;
  name: string;
  domain: string;
  category: string;
  status: string;
  razorpayAccountId?: string | null;
}

export interface PaymentIntent {
  id: string;
  agentId: string;
  vendorId?: string | null;
  rawVendorName: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
  status: IntentStatus | string;
  decision?: Decision | string | null;
  rejectionReason?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  paymentIntentId?: string | null;
  agentId: string;
  eventType: string;
  decision?: Decision | string | null;
  reason: string;
  metadata: string;
  timestamp: string;
  agent?: Agent | null;
  paymentIntent?: PaymentIntent | null;
}

export interface DashboardMetrics {
  totalAgents: number;
  activeAgents: number;
  totalDailyBudget: number;
  spentDaily: number;
  totalMonthlyBudget: number;
  spentMonthly: number;
  pendingApprovals: number;
  blockedTransactions: number;
  completedTransactions: number;
  totalAuditEvents: number;
}

export interface ToolOutput {
  paymentIntentId: string;
  decision: Decision;
  status: string;
  reason: string;
  ruleTriggered: string;
  razorpayOrderId: string | null;
  nextAction: "PROCEED_TO_CHECKOUT" | "AWAIT_HUMAN_APPROVAL" | "CANCEL_TRANSACTION";
  evalSnapshot: {
    agentId: string;
    amount: number;
    currency: string;
    category: string;
    dailyBudgetRemaining: number;
    monthlyBudgetRemaining: number;
  };
}

export interface ScenarioResult {
  scenario: string;
  userPrompt: string;
  agentThought: string;
  proposedPayment: {
    vendor: string;
    amount: number;
    currency?: string;
    category: string;
    purpose: string;
  };
  toolOutput: ToolOutput;
}
