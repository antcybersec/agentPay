import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🛡️ AgentPay Policy Guardrail Engine running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Agents API:   http://localhost:${PORT}/api/agents`);
  console.log(`   Vendors API:  http://localhost:${PORT}/api/vendors`);
  console.log(`   Evaluate API: http://localhost:${PORT}/api/payment-intents/evaluate\n`);
});
