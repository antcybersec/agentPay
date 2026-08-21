import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bot,
  UserCheck,
  FileText,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Download,
  ExternalLink,
  Zap,
  DollarSign,
  Layers,
  Activity,
  Play,
  Search,
  Code,
  Key,
  Sliders,
  AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:4000/api';
const ADMIN_API_KEY = 'admin_secret_key_123';
const RESEARCHBOT_API_KEY = 'agkey_researchbot_7f8a9b2c3d';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'playground' | 'approval' | 'audit' | 'security'>('playground');
  const [metrics, setMetrics] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [auditEvents, setAuditEventList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  // Playground state
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Policy edit state
  const [policyForm, setPolicyForm] = useState({
    autoApproveLimit: 5000,
    humanApprovalLimit: 10000,
    hardMaximum: 10000,
  });

  // Audit modal state
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Security Simulator state
  const [simResults, setSimResults] = useState<Record<string, any>>({});
  const [simLoading, setSimLoading] = useState<Record<string, boolean>>({});

  const [adminApiKey, setAdminApiKey] = useState('admin_secret_key_123');
  const [agentApiKey, setAgentApiKey] = useState('agkey_researchbot_7f8a9b2c3d');

  useEffect(() => {
    fetchData();
  }, [adminApiKey, agentApiKey]);

  const fetchData = async () => {
    setLoading(true);
    const authHeaders = {
      Authorization: `Bearer ${adminApiKey}`,
      'x-agent-api-key': agentApiKey,
    };
    try {
      const [metricsRes, agentsRes, vendorsRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard/metrics`, { headers: authHeaders }).then((r) => r.json()).catch(() => null),
        fetch(`${API_BASE}/agents`, { headers: authHeaders }).then((r) => r.json()).catch(() => null),
        fetch(`${API_BASE}/vendors`).then((r) => r.json()).catch(() => null),
        fetch(`${API_BASE}/audit-events`, { headers: authHeaders }).then((r) => r.json()).catch(() => null),
      ]);

      if (metricsRes?.success) setMetrics(metricsRes.data);
      if (agentsRes?.success) {
        setAgents(agentsRes.data);
        if (agentsRes.data[0]?.policy) {
          setPolicyForm({
            autoApproveLimit: agentsRes.data[0].policy.autoApproveLimit,
            humanApprovalLimit: agentsRes.data[0].policy.humanApprovalLimit,
            hardMaximum: agentsRes.data[0].policy.hardMaximum,
          });
        }
      }
      if (vendorsRes?.success) setVendors(vendorsRes.data);
      if (auditRes?.success) setAuditEventList(auditRes.data);
      setApiConnected(true);
    } catch (err) {
      console.error(err);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Run Scenario in Playground
  const handleRunScenario = async (scenarioKey: 'A' | 'B' | 'C') => {
    setScenarioLoading(true);
    setScenarioResult(null);
    try {
      const res = await fetch(`${API_BASE}/agent/run-scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-api-key': RESEARCHBOT_API_KEY,
        },
        body: JSON.stringify({ scenario: scenarioKey }),
      });
      const json = await res.json();
      setScenarioResult(json.data);
      fetchData();
    } catch (err: any) {
      alert(`Scenario execution error: ${err.message}`);
    } finally {
      setScenarioLoading(false);
    }
  };

  // Run Custom Prompt
  const handleRunCustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    setScenarioLoading(true);
    setScenarioResult(null);
    try {
      const res = await fetch(`${API_BASE}/agent/request-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-api-key': RESEARCHBOT_API_KEY,
        },
        body: JSON.stringify({
          vendor: 'ArXiv Data Insights',
          amount: 1499,
          currency: 'INR',
          category: 'RESEARCH_PAPER',
          purpose: customPrompt,
        }),
      });
      const json = await res.json();
      setScenarioResult({
        scenario: 'CUSTOM',
        userPrompt: customPrompt,
        agentThought: `Executing tool request for prompt: "${customPrompt}"`,
        proposedPayment: {
          vendor: 'ArXiv Data Insights',
          amount: 1499,
          currency: 'INR',
          category: 'RESEARCH_PAPER',
          purpose: customPrompt,
        },
        toolOutput: json.data,
      });
      fetchData();
    } catch (err: any) {
      alert(`Custom prompt error: ${err.message}`);
    } finally {
      setScenarioLoading(false);
    }
  };

  // Open Razorpay Checkout Modal
  const openRazorpayCheckout = (orderId: string, amount: number, vendorName: string) => {
    if (!window.Razorpay) {
      alert('Razorpay Checkout SDK is loading... Please try again in a moment.');
      return;
    }

    const options = {
      key: 'rzp_test_dummy_key_id',
      amount: amount * 100,
      currency: 'INR',
      name: 'AgentPay Guardrail Gateway',
      description: `Verified Payment for ${vendorName}`,
      order_id: orderId,
      handler: async function (response: any) {
        alert(`🎉 Payment Captured Successfully!\nRazorpay Payment ID: ${response.razorpay_payment_id}`);
        // Trigger local test webhook to complete payment in backend
        await fetch(`${API_BASE}/test/trigger-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment.captured',
            razorpayOrderId: orderId,
            amountPaid: amount,
          }),
        });
        fetchData();
      },
      theme: { color: '#06b6d4' },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Human Admin Approve Call
  const handleAdminApprove = async (intentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/payment-intents/${intentId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ADMIN_API_KEY}`,
        },
      });
      const json = await res.json();

      if (!json.success) {
        alert(`❌ Approval Rejected by Policy Re-Evaluation:\n${json.error}`);
      } else {
        alert('✅ Intent Approved by Human Admin! Razorpay Order Created.');
        if (json.data?.order?.razorpayOrderId) {
          openRazorpayCheckout(
            json.data.order.razorpayOrderId,
            json.data.order.paymentIntent.amount,
            json.data.order.paymentIntent.rawVendorName
          );
        }
      }
      fetchData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  // Human Admin Reject Call
  const handleAdminReject = async (intentId: string) => {
    try {
      await fetch(`${API_BASE}/payment-intents/${intentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_API_KEY}`,
        },
        body: JSON.stringify({ reason: 'Rejected by Human Admin in Portal' }),
      });
      alert('Intent Rejected by Admin.');
      fetchData();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  // Update Agent Policy Limits
  const handleSavePolicy = async () => {
    const researchBot = agents[0];
    if (!researchBot) return;

    try {
      const res = await fetch(`${API_BASE}/agent-policy/${researchBot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_API_KEY}`,
        },
        body: JSON.stringify(policyForm),
      });
      const json = await res.json();
      if (json.success) {
        alert('✅ Agent Policy Limits Updated Successfully!');
        fetchData();
      }
    } catch (err: any) {
      alert(`Policy update error: ${err.message}`);
    }
  };

  // Toggle Agent Active / Paused Status
  const handleToggleAgentStatus = async (currentStatus: string) => {
    const researchBot = agents[0];
    if (!researchBot) return;

    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await fetch(`${API_BASE}/agents/${researchBot.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_API_KEY}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      alert(`Agent Status updated to ${newStatus}`);
      fetchData();
    } catch (err: any) {
      alert(`Status error: ${err.message}`);
    }
  };

  // Reset Demo DB
  const handleResetDemo = async () => {
    if (!confirm('Reset AgentPay demo database to initial state?')) return;
    try {
      await fetch(`${API_BASE}/test/reset-demo`, { method: 'POST' });
      alert('🎉 AgentPay Database Reset Successfully!');
      setScenarioResult(null);
      fetchData();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    }
  };

  // Run Security Simulation Attack
  const handleRunSecurityAttack = async (attackType: string) => {
    setSimLoading((prev) => ({ ...prev, [attackType]: true }));
    try {
      const res = await fetch(`${API_BASE}/test/security-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackType }),
      });
      const json = await res.json();
      setSimResults((prev) => ({ ...prev, [attackType]: json }));
    } catch (err: any) {
      setSimResults((prev) => ({ ...prev, [attackType]: { success: false, error: err.message } }));
    } finally {
      setSimLoading((prev) => ({ ...prev, [attackType]: false }));
    }
  };

  // Export Audit CSV / JSON
  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'EventType', 'Decision', 'AgentID', 'PaymentIntentID', 'Reason'];
    const rows = auditEvents.map((e) => [
      e.timestamp,
      e.eventType,
      e.decision || 'N/A',
      e.agentId,
      e.paymentIntentId || 'N/A',
      `"${(e.reason || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `agentpay_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAuditJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `agentpay_audit_ledger_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredAuditEvents = auditEvents.filter((e) => {
    if (auditFilter !== 'ALL' && e.eventType !== auditFilter && e.decision !== auditFilter) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      return (
        e.eventType?.toLowerCase().includes(q) ||
        e.reason?.toLowerCase().includes(q) ||
        e.paymentIntentId?.toLowerCase().includes(q) ||
        e.agentId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const researchBot = agents[0] || {};
  const currentPolicy = researchBot.policy || {};

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 glow-cyan">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                AgentPay
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                Guardrail Gateway v1.0
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {[
              { id: 'playground', label: 'AI Playground', icon: Bot },
              { id: 'approval', label: 'Human Approval Queue', icon: UserCheck, count: metrics?.pendingApprovals },
              { id: 'dashboard', label: 'Admin Dashboard', icon: Sliders },
              { id: 'audit', label: 'Audit Ledger', icon: FileText },
              { id: 'security', label: 'Security Simulator', icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Server Status & Reset */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetDemo}
              title="Reset Demo DB"
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-colors border border-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300">{apiConnected ? 'Policy Engine Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ========================================================= */}
        {/* TAB 1: AI AGENT PLAYGROUND */}
        {/* ========================================================= */}
        {activeTab === 'playground' && (
          <div className="space-y-8">
            {/* Playground Banner */}
            <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                      UNTRUSTED AGENT BOUNDARY
                    </span>
                    <span className="text-xs text-slate-400">Agent API Key Authenticated</span>
                  </div>
                  <h2 className="text-2xl font-bold mt-2 text-white">AI Agent Payment Playground</h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                    Interact with <strong className="text-cyan-300">ResearchBot</strong>. The AI agent proposes purchases, but <strong className="text-white">AgentPay's Policy Engine</strong> deterministically evaluates every transaction before Razorpay order creation.
                  </p>
                </div>
                <div className="flex items-center space-x-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
                  <div>
                    <div className="text-slate-400">Daily Spent</div>
                    <div className="text-cyan-400 font-bold text-base">₹{researchBot.spentDaily?.toLocaleString() || 800} / ₹{researchBot.dailyBudget?.toLocaleString() || 20000}</div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div>
                    <div className="text-slate-400">Auto-Approve Limit</div>
                    <div className="text-emerald-400 font-bold text-base">≤ ₹{currentPolicy.autoApproveLimit?.toLocaleString() || 5000}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Scenario Launchers */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Test Quick Scenarios</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Scenario A Card */}
                <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border-l-4 border-l-emerald-500">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                        SCENARIO A — ALLOW
                      </span>
                      <span className="text-lg font-extrabold text-white font-mono">₹1,499</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Download ML Benchmark Dataset</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      ArXiv Data Insights (Verified Research Vendor). Fits auto-approval limit (≤ ₹5,000).
                    </p>
                  </div>
                  <button
                    onClick={() => handleRunScenario('A')}
                    disabled={scenarioLoading}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center justify-center space-x-2 transition-all"
                  >
                    <span>Run Scenario A</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Scenario B Card */}
                <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border-l-4 border-l-amber-500">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                        SCENARIO B — HUMAN APPROVAL
                      </span>
                      <span className="text-lg font-extrabold text-white font-mono">₹7,500</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Statista Market Database</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Statista Market Research. Exceeds auto-approval (₹5,000) but within human limit (₹10,000).
                    </p>
                  </div>
                  <button
                    onClick={() => handleRunScenario('B')}
                    disabled={scenarioLoading}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/30 flex items-center justify-center space-x-2 transition-all"
                  >
                    <span>Run Scenario B</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Scenario C Card */}
                <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border-l-4 border-l-rose-500">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono font-bold">
                        SCENARIO C — BLOCK
                      </span>
                      <span className="text-lg font-extrabold text-white font-mono">₹25,000</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Enterprise Research Site License</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Exceeds hard maximum limit (₹10,000). Guardrail blocks order creation instantly.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRunScenario('C')}
                    disabled={scenarioLoading}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold border border-rose-500/30 flex items-center justify-center space-x-2 transition-all"
                  >
                    <span>Run Scenario C</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Prompt Box */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <label className="block text-sm font-semibold text-slate-300">
                Or Send Custom Research Procurement Prompt to ResearchBot
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Procure GPU cluster compute credits on AWS Cloud Services for ₹2,500"
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={handleRunCustomPrompt}
                  disabled={scenarioLoading || !customPrompt.trim()}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <span>Execute</span>
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Step-by-Step Visual Execution Flow */}
            {scenarioResult && (
              <div className="glass-panel p-6 rounded-2xl space-y-6 border border-cyan-500/30 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">Live Policy Execution Flow</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Transaction ID: {scenarioResult.toolOutput?.paymentIntentId}</span>
                </div>

                {/* Execution Pipeline Steps */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                  {/* Step 1: User Intent */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">1. User Intent</div>
                    <div className="text-xs font-medium text-slate-200 mt-2">{scenarioResult.userPrompt}</div>
                    <div className="text-[10px] text-slate-500 mt-2">Parsed by LLM</div>
                  </div>

                  {/* Step 2: Agent Tool Request */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div className="text-[10px] font-mono text-teal-400 font-bold uppercase">2. Tool Call</div>
                    <div className="text-xs font-mono text-slate-200 mt-2 font-bold">{scenarioResult.proposedPayment?.vendor}</div>
                    <div className="text-xs font-mono text-cyan-300">INR {scenarioResult.proposedPayment?.amount?.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-1">request_payment()</div>
                  </div>

                  {/* Step 3: Policy Engine */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">3. Policy Engine</div>
                    <div className="text-xs font-mono text-slate-300 mt-2">{scenarioResult.toolOutput?.ruleTriggered}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Deterministic Rules</div>
                  </div>

                  {/* Step 4: Decision */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                    scenarioResult.toolOutput?.decision === 'ALLOW'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : scenarioResult.toolOutput?.decision === 'REQUIRE_HUMAN_APPROVAL'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <div className="text-[10px] font-mono font-bold uppercase">4. Decision</div>
                    <div className="text-base font-extrabold mt-1">{scenarioResult.toolOutput?.decision}</div>
                    <div className="text-[10px] opacity-80 mt-1 line-clamp-2">{scenarioResult.toolOutput?.reason}</div>
                  </div>

                  {/* Step 5: Action */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">5. Action</div>
                    {scenarioResult.toolOutput?.nextAction === 'PROCEED_TO_CHECKOUT' && (
                      <button
                        onClick={() => openRazorpayCheckout(scenarioResult.toolOutput.razorpayOrderId, scenarioResult.proposedPayment.amount, scenarioResult.proposedPayment.vendor)}
                        className="mt-2 w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center space-x-1"
                      >
                        <span>Checkout</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {scenarioResult.toolOutput?.nextAction === 'AWAIT_HUMAN_APPROVAL' && (
                      <div className="text-xs font-semibold text-amber-400 mt-2 flex items-center space-x-1">
                        <UserCheck className="w-4 h-4" />
                        <span>Queued for Admin</span>
                      </div>
                    )}
                    {scenarioResult.toolOutput?.nextAction === 'CANCEL_TRANSACTION' && (
                      <div className="text-xs font-semibold text-rose-400 mt-2 flex items-center space-x-1">
                        <XCircle className="w-4 h-4" />
                        <span>Transaction Stopped</span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 mt-2 font-mono">{scenarioResult.toolOutput?.nextAction}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: HUMAN APPROVAL QUEUE */}
        {/* ========================================================= */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl flex justify-between items-center border border-amber-500/20">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <UserCheck className="w-6 h-6 text-amber-400" />
                  <span>Human Admin Approval Queue</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  High-value transactions (₹5,000–₹10,000) require human admin sign-off. Approvals re-evaluate policy against live balances before order creation.
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                {auditEvents.filter((e) => e.paymentIntent?.status === 'PENDING_HUMAN_APPROVAL').length} Pending
              </span>
            </div>

            {/* Pending Approvals List */}
            <div className="space-y-4">
              {auditEvents
                .filter((e) => e.paymentIntent?.status === 'PENDING_HUMAN_APPROVAL')
                .map((event) => {
                  const intent = event.paymentIntent;
                  if (!intent) return null;
                  return (
                    <div key={intent.id} className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center space-x-3">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                            PENDING APPROVAL
                          </span>
                          <span className="text-xs font-mono text-slate-400">ID: {intent.id}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {intent.rawVendorName} — <span className="font-mono text-cyan-400">INR {intent.amount.toLocaleString()}</span>
                        </h3>
                        <p className="text-xs text-slate-300">
                          <strong>Purpose:</strong> {intent.purpose}
                        </p>
                        <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg font-mono">
                          ⚠️ {event.reason}
                        </p>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleAdminReject(intent.id)}
                          className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold border border-rose-500/30 text-xs transition-colors flex items-center space-x-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleAdminApprove(intent.id)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Order</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {auditEvents.filter((e) => e.paymentIntent?.status === 'PENDING_HUMAN_APPROVAL').length === 0 && (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                  <h3 className="text-base font-bold text-white">Queue Empty — No Pending Approvals</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Go to the <strong>AI Playground</strong> and click <strong>Run Scenario B</strong> to simulate a ₹7,500 high-value request requiring human admin sign-off.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ADMIN DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <div className="text-xs font-mono text-slate-400">Total Spent Daily</div>
                <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                  ₹{metrics?.spentDaily?.toLocaleString() || 800}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Limit: ₹{metrics?.totalDailyBudget?.toLocaleString() || 20000}</div>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <div className="text-xs font-mono text-slate-400">Total Spent Monthly</div>
                <div className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">
                  ₹{metrics?.spentMonthly?.toLocaleString() || 4500}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Limit: ₹{metrics?.totalMonthlyBudget?.toLocaleString() || 100000}</div>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <div className="text-xs font-mono text-slate-400">Pending Approvals</div>
                <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                  {metrics?.pendingApprovals || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Requires Admin Action</div>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <div className="text-xs font-mono text-slate-400">Blocked Transactions</div>
                <div className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">
                  {metrics?.blockedTransactions || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Guardrails Enforced</div>
              </div>
            </div>

            {/* Agent Control & Policy Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agent Status Panel */}
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Bot className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{researchBot.name || 'ResearchBot'}</h3>
                      <p className="text-xs text-slate-400">{researchBot.role || 'AI Research Agent'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAgentStatus(researchBot.status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-colors ${
                      researchBot.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                    }`}
                  >
                    {researchBot.status === 'ACTIVE' ? '🟢 ACTIVE' : '🔴 PAUSED'}
                  </button>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl space-y-3 font-mono text-xs border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Agent API Key:</span>
                    <span className="text-cyan-400 font-bold">{researchBot.apiKey || 'agkey_researchbot_7f8a9b2c3d'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Spent Today:</span>
                    <span className="text-white font-bold">₹{researchBot.spentDaily?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Spent:</span>
                    <span className="text-white font-bold">₹{researchBot.spentMonthly?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Policy Threshold Form */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <span>Update Policy Thresholds</span>
                </h3>
                
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="text-slate-300 block mb-1">Auto-Approve Limit (INR)</label>
                    <input
                      type="number"
                      value={policyForm.autoApproveLimit}
                      onChange={(e) => setPolicyForm({ ...policyForm, autoApproveLimit: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Human Approval Threshold (INR)</label>
                    <input
                      type="number"
                      value={policyForm.humanApprovalLimit}
                      onChange={(e) => setPolicyForm({ ...policyForm, humanApprovalLimit: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Hard Maximum Transaction Limit (INR)</label>
                    <input
                      type="number"
                      value={policyForm.hardMaximum}
                      onChange={(e) => setPolicyForm({ ...policyForm, hardMaximum: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePolicy}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
                >
                  Save Policy Config
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: AUDIT LEDGER */}
        {/* ========================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-cyan-500/20">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-cyan-400" />
                  <span>Immutable Audit Ledger</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cryptographically verifiable append-only ledger tracking all intent evaluations, human admin sign-offs, and Razorpay webhook receipts.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={exportAuditCsv}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={exportAuditJson}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Code className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search events by reason, intent ID, or agent ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
                {['ALL', 'POLICY_EVALUATED', 'ORDER_CREATED', 'HUMAN_APPROVED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAuditFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors ${
                      auditFilter === f
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Event Type</th>
                      <th className="p-4">Decision</th>
                      <th className="p-4">Reason / Rule Triggered</th>
                      <th className="p-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAuditEvents.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-slate-400 text-[11px]">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.eventType === 'PAYMENT_SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                            e.eventType === 'ORDER_CREATED' ? 'bg-cyan-500/20 text-cyan-400' :
                            e.eventType === 'HUMAN_APPROVED' ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {e.eventType}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.decision === 'ALLOW' || e.decision === 'HUMAN_APPROVED' ? 'text-emerald-400' :
                            e.decision === 'REQUIRE_HUMAN_APPROVAL' ? 'text-amber-400' :
                            'text-rose-400'
                          }`}>
                            {e.decision || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 max-w-md truncate">
                          {e.reason}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedAudit(e)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 transition-colors"
                          >
                            View Metadata
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Detail Modal Drawer */}
            {selectedAudit && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="glass-panel p-6 rounded-2xl max-w-2xl w-full border border-cyan-500/30 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                      <Code className="w-5 h-5 text-cyan-400" />
                      <span>AuditEvent JSON Snapshot</span>
                    </h3>
                    <button
                      onClick={() => setSelectedAudit(null)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800 max-h-96">
                    {JSON.stringify(
                      {
                        id: selectedAudit.id,
                        eventType: selectedAudit.eventType,
                        decision: selectedAudit.decision,
                        reason: selectedAudit.reason,
                        timestamp: selectedAudit.timestamp,
                        metadata: JSON.parse(selectedAudit.metadata || '{}'),
                      },
                      null,
                      2
                    )}
                  </pre>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedAudit(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SECURITY ATTACK SIMULATOR */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-rose-500/30">
              <div className="flex items-center space-x-3">
                <Lock className="w-7 h-7 text-rose-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Live Backend Security Attack Simulator</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute real penetration test attacks against the live AgentPay backend. Proves that untrusted AI agents cannot bypass deterministic guardrails.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: 'MALICIOUS_PAYLOAD_INJECTION',
                  title: '1. Malicious Payload Field Injection',
                  desc: 'AI injects {"decision": "ALLOW", "status": "APPROVED"} in tool payload to force payment.',
                  expected: '400 Bad Request — Zod .strict() Schema rejects unauthorized properties.',
                },
                {
                  id: 'UNAUTHENTICATED_CREATE_ORDER',
                  title: '2. Unauthenticated Order Creation',
                  desc: 'Attacker calls /api/payment-intents/:id/create-order without headers.',
                  expected: '401 Unauthorized — Middleware rejects request.',
                },
                {
                  id: 'CROSS_AGENT_ORDER_ATTEMPT',
                  title: '3. Cross-Agent Order Creation Attempt',
                  desc: 'Agent B attempts to create a Razorpay Order for Agent A\'s PaymentIntent.',
                  expected: '403 Forbidden — Ownership authorization boundary enforced.',
                },
                {
                  id: 'BLOCKED_INTENT_ORDER_ATTEMPT',
                  title: '4. Order Creation on BLOCKED Intent',
                  desc: 'Client attempts order creation for a blocked gambling transaction.',
                  expected: '400 Bad Request — State machine throws GUARDRAIL VIOLATION.',
                },
                {
                  id: 'DUPLICATE_ORDER_ATTEMPT',
                  title: '5. Duplicate Order Creation Retry',
                  desc: 'Client calls create-order twice for an existing order.',
                  expected: '200 OK — Idempotently returns existing order without overwriting.',
                },
              ].map((sim) => {
                const res = simResults[sim.id];
                const isLoading = simLoading[sim.id];
                return (
                  <div key={sim.id} className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{sim.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{sim.desc}</p>
                      <div className="mt-3 p-2.5 bg-slate-900/80 rounded-lg text-[11px] font-mono text-cyan-300 border border-slate-800">
                        <strong>Expected Security Behavior:</strong> {sim.expected}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800">
                      <button
                        onClick={() => handleRunSecurityAttack(sim.id)}
                        disabled={isLoading}
                        className="w-full py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold border border-rose-500/30 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Shield className="w-4 h-4" />
                            <span>Simulate Attack Against Server</span>
                          </>
                        )}
                      </button>

                      {res && (
                        <div className={`p-3 rounded-xl text-xs font-mono space-y-1 ${
                          res.blocked ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                        }`}>
                          <div className="font-bold flex items-center space-x-1.5">
                            {res.blocked ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                            <span>{res.blocked ? '🛡️ ATTACK BLOCKED BY AGENTPAY' : '❌ ATTACK SUCCEEDED'}</span>
                          </div>
                          <div>Status Code: <strong className="text-white">{res.status}</strong></div>
                          {res.guardrailTriggered && <div>Guardrail: {res.guardrailTriggered}</div>}
                          {res.error && <div className="opacity-80">Error: {res.error}</div>}
                          {res.isIdempotentReplay !== undefined && <div>Idempotent Replay: {String(res.isIdempotentReplay)}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs font-mono text-slate-500">
        AgentPay — Deterministic Financial Guardrails & Untrusted AI Agent Gateway for Razorpay • Hackathon Build
      </footer>
    </div>
  );
}
