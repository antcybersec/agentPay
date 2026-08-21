import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AgentPay database with updated policy semantics...');

  // Clean existing records
  await prisma.auditEvent.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.agentPolicy.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.vendor.deleteMany();

  // 1. Seed Demo Vendors
  const vendorArxiv = await prisma.vendor.create({
    data: {
      id: 'vendor-arxiv-001',
      name: 'ArXiv Data Insights',
      domain: 'arxiv.org',
      category: 'RESEARCH_PAPER',
      status: 'VERIFIED',
      razorpayAccountId: 'acc_arxiv_test_123',
    },
  });

  const vendorStatista = await prisma.vendor.create({
    data: {
      id: 'vendor-statista-002',
      name: 'Statista Market Research',
      domain: 'statista.com',
      category: 'DATASET',
      status: 'VERIFIED',
      razorpayAccountId: 'acc_statista_test_456',
    },
  });

  const vendorAws = await prisma.vendor.create({
    data: {
      id: 'vendor-aws-003',
      name: 'AWS Cloud Services',
      domain: 'aws.amazon.com',
      category: 'CLOUD_COMPUTE',
      status: 'VERIFIED',
      razorpayAccountId: 'acc_aws_test_789',
    },
  });

  const vendorCasino = await prisma.vendor.create({
    data: {
      id: 'vendor-casino-004',
      name: 'Shady Casino Online',
      domain: 'shadycasino.com',
      category: 'GAMBLING',
      status: 'BLOCKED',
    },
  });

  console.log('✅ Demo Vendors Seeded');

  // 2. Seed Agent (ResearchBot)
  const agent = await prisma.agent.create({
    data: {
      id: 'agent-researchbot-001',
      name: 'ResearchBot',
      role: 'Autonomous AI Researcher & Data Procurement Agent',
      status: 'ACTIVE',
      dailyBudget: 20000.0,   // ₹20,000 / day
      monthlyBudget: 100000.0, // ₹100,000 / month
      spentDaily: 800.0,      // Already spent ₹800 today
      spentMonthly: 4500.0,   // Already spent ₹4,500 this month
    },
  });

  console.log('✅ Agent (ResearchBot) Seeded');

  // 3. Seed Updated Financial Policy for ResearchBot
  await prisma.agentPolicy.create({
    data: {
      id: 'policy-researchbot-001',
      agentId: agent.id,
      autoApproveLimit: 5000.0,    // <= ₹5,000 -> ALLOW
      humanApprovalLimit: 10000.0, // > ₹5,000 & <= ₹10,000 -> REQUIRE_HUMAN_APPROVAL
      hardMaximum: 10000.0,        // > ₹10,000 -> BLOCK
      allowedCategories: JSON.stringify(['RESEARCH_PAPER', 'DATASET', 'CLOUD_COMPUTE', 'API_SUBSCRIPTION']),
      blockedCategories: JSON.stringify(['GAMBLING', 'CRYPTO', 'GIFT_CARDS']),
      allowedVendorIds: JSON.stringify([vendorArxiv.id, vendorStatista.id, vendorAws.id]),
      requireVendorVerification: true,
      isActive: true,
    },
  });

  console.log('✅ Updated Agent Policy Seeded');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
