# 🛡️ AgentPay — Financial Guardrails & Untrusted AI Agent Gateway for Razorpay

> **Core Architectural Principle:** The AI Agent is **UNTRUSTED**. The AI/LLM can reason, parse user intent, and propose payment parameters, but has **ZERO AUTHORITY** to approve payments, adjust policies or budgets, generate Razorpay orders directly, or bypass the Policy Engine.

---

## 🌟 Executive Overview & Problem Statement

As AI Agents evolve from simple chatbots into autonomous agents that perform real-world actions, giving an LLM direct access to credit cards or financial API keys poses catastrophic risk:
- **Prompt Injection & Unbounded Spending**: An attacker can inject instructions forcing an LLM to drain funds.
- **Hallucinated Transactions**: LLMs can miscalculate transaction values or select unverified vendor domains.
- **Lack of Governance**: Businesses require strict spending caps, human approval thresholds, category blocklists, and immutable audit logs.

**AgentPay** solves this by inserting a **Deterministic Policy Engine & Guardrail Gateway** between autonomous AI Agents and **Razorpay**.

```
User Prompt ("Procure ML dataset")
               ↓
    [ Untrusted AI Agent ]  (Generates request_payment tool proposal)
               ↓
  x-agent-api-key: agkey_researchbot_... (Server-bound Agent Authentication)
               ↓
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENTPAY GUARDRAIL ENGINE                        │
│ 1. Server-Side Agent Identity Binding (Prevents Impersonation)        │
│ 2. Zod Strict Schema Validation (Strips Malicious Fields)             │
│ 3. Deterministic Policy Engine (12 Rules Evaluated Server-Side)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │ ALLOW              │ REQUIRE_HUMAN      │ BLOCK
               ↓                    ↓                    ↓
      Razorpay Order API      Human Approval Queue      STOP (0 Orders)
       (ORDER_CREATED)       (Admin Approves → Order)  (Status: REJECTED)
               │                    │                    │
               └────────────────────┴────────────────────┘
                                    │
                                    ▼
                      Immutable Audit Event Ledger
```

---

## 🚀 Key Features & Capabilities

- 🛡️ **Untrusted AI Agent Runtime**: Financial tool boundary (`request_payment`) with server-bound API key authentication and Zod `.strict()` schema sanitization.
- 🎯 **12 Deterministic Policy Rules**: Hard limits, daily & monthly budgets, category blocklists, vendor whitelist, and vendor domain verification.
- 💳 **Razorpay Integration & Standard Checkout**: Real Razorpay Test API support (`rzp_test_...`) with seamless deterministic mock fallback for offline automated testing.
- 👤 **Human Approval & Policy Re-Evaluation**: High-value transactions (₹5,000–₹10,000) queue for human admin sign-off (`Authorization: Bearer <ADMIN_API_KEY>`). Approvals execute real-time policy re-evaluation before order creation.
- ⚡ **Local Webhook Simulator**: Signed local webhook test harness (`POST /api/test/trigger-webhook`) enabling instant demo verification without ngrok tunneling.
- 📜 **Immutable Audit Ledger**: Searchable, filterable event ledger with full JSON snapshot drawer and CSV/JSON compliance export.
- 🔒 **Security Attack Simulator**: Live interactive security simulation panel allowing judges to execute real penetration test attacks against the backend.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express, Prisma ORM, SQLite database.
- **Payment Gateway**: Official `@razorpay/node-sdk` and Razorpay Standard Checkout JS SDK.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Testing Suite**: Vitest (38 unit & integration tests).

---

## 🚦 Quick Start & Local Setup

### 1. Prerequisites
- Node.js v18+ & npm

### 2. Installation
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="file:./dev.db"

# Admin Authentication Secret
ADMIN_API_KEY=admin_secret_key_123

# Razorpay Credentials (Use rzp_test_... for Real Test Mode, or placeholder for Mock Mode)
RAZORPAY_KEY_ID=rzp_test_dummy_key_id
RAZORPAY_KEY_SECRET=dummy_key_secret
RAZORPAY_WEBHOOK_SECRET=dummy_webhook_secret
```

### 4. Database Setup & Seed
```bash
npx prisma db push --accept-data-loss
npm run db:seed
```

### 5. Run Local Development Server
```bash
# Start backend API (Port 4000)
npm run dev

# In a separate terminal, start frontend UI (Port 5173)
cd frontend && npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 🧪 Running Automated Tests

AgentPay includes 38 automated unit & integration tests covering policy evaluation, state machine guardrails, admin authentication, agent API key binding, Zod sanitization, and Razorpay order idempotency:

```bash
npm test
```

```
 RUN  v1.6.1 /Users/anantkumar/Downloads/agentPay

 ✓ tests/policyEngine.test.ts  (13 tests)
 ✓ tests/agentRuntime.test.ts  (5 tests)
 ✓ tests/consolidatedBuild.test.ts  (4 tests)
 ✓ tests/razorpayIntegration.test.ts  (16 tests)

 Test Files  4 passed (4)
      Tests  38 passed (38)
```

---

## 🎬 5-Minute Hackathon Demo Walkthrough

1. **AI Agent Playground Tab**:
   - Click **Run Scenario A (ALLOW)**: ResearchBot requests ₹1,499 for ArXiv Data Insights $\rightarrow$ Policy Engine evaluates `ALLOW` $\rightarrow$ Razorpay Order generated $\rightarrow$ Click **Checkout** to trigger Razorpay Checkout modal.
   - Click **Run Scenario B (REQUIRE_HUMAN_APPROVAL)**: ResearchBot requests ₹7,500 for Statista Market Research $\rightarrow$ Policy Engine evaluates `REQUIRE_HUMAN_APPROVAL` $\rightarrow$ Queues in Human Approval Queue.
   - Click **Run Scenario C (BLOCK)**: ResearchBot requests ₹25,000 for enterprise site license $\rightarrow$ Policy Engine evaluates `BLOCK` (`HARD_MAXIMUM_EXCEEDED`) $\rightarrow$ 0 Razorpay orders created.
2. **Human Approval Queue Tab**:
   - View pending ₹7,500 intent. Click **Approve & Order** $\rightarrow$ Re-evaluates current policy $\rightarrow$ Creates Razorpay Order $\rightarrow$ Opens Checkout modal.
   - Click **Trigger Payment Success Webhook** $\rightarrow$ Executes HMAC-signed webhook simulation $\rightarrow$ Updates agent spent totals atomically.
3. **Security Simulator Tab**:
   - Execute penetration tests against backend:
     - *Malicious Payload Injection* $\rightarrow$ Zod `.strict()` schema returns HTTP 400.
     - *Unauthenticated Create Order* $\rightarrow$ Returns HTTP 401.
     - *Cross-Agent Order Attempt* $\rightarrow$ Returns HTTP 403 Forbidden.
     - *Duplicate Order Creation* $\rightarrow$ Returns cached order idempotently (`isIdempotentReplay: true`).
4. **Audit Ledger Tab**:
   - Search & filter financial audit logs. Click any row to view complete formatted JSON metadata snapshot. Click **Export CSV** or **Export JSON**.
