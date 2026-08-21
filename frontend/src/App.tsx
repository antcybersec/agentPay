import React, { useEffect, useState } from 'react';

export default function App() {
  const [serverStatus, setServerStatus] = useState<string>('Checking...');
  const [agents, setAgents] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => setServerStatus(data.service + ' (Online)'))
      .catch(() => setServerStatus('Backend Offline'));

    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => setAgents(data.data || []))
      .catch(() => {});

    fetch('/api/vendors')
      .then((res) => res.json())
      .then((data) => setVendors(data.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div className="title-group">
          <h1>🛡️ AgentPay</h1>
          <span className="badge">Phase 0-3 Foundation</span>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Engine Status: </span>
          <strong style={{ color: '#00f2fe' }}>{serverStatus}</strong>
        </div>
      </header>

      <div className="card">
        <h2 className="card-title">Core Architecture & Flow</h2>
        <div className="grid">
          <div className="flow-step">
            <h4>1. AI Agent</h4>
            <p>Generates financial Payment Intent request.</p>
          </div>
          <div className="flow-step">
            <h4>2. Policy Engine</h4>
            <p>Deterministic evaluation of budget, vendor, and category limits.</p>
          </div>
          <div className="flow-step">
            <h4>3. Decision Guardrail</h4>
            <p>ALLOW / BLOCK / REQUIRE_HUMAN_APPROVAL.</p>
          </div>
          <div className="flow-step">
            <h4>4. Audit Ledger</h4>
            <p>Immutable logging of all payment intent outcomes.</p>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3 className="card-title">🤖 Seeded Agents</h3>
          {agents.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No agents seeded yet. Run <code>npm run db:seed</code>.</p>
          ) : (
            agents.map((agent) => (
              <div key={agent.id} style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #263248' }}>
                <h4>{agent.name}</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{agent.role}</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#00f2fe' }}>
                  Daily Budget: ₹{agent.dailyBudget} | Per Tx Limit: ₹{agent.perTxLimit}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 className="card-title">🏢 Trusted Vendors</h3>
          {vendors.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No vendors seeded yet. Run <code>npm run db:seed</code>.</p>
          ) : (
            vendors.map((vendor) => (
              <div key={vendor.id} style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{vendor.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{vendor.domain} ({vendor.category})</div>
                </div>
                <span className="badge" style={{
                  color: vendor.status === 'VERIFIED' ? '#10b981' : '#ef4444',
                  borderColor: vendor.status === 'VERIFIED' ? '#10b981' : '#ef4444',
                  background: 'transparent'
                }}>
                  {vendor.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
