import { RequestPaymentInput } from './agentTypes.js';

export interface LlmScenarioDefinition {
  scenarioKey: string;
  userPrompt: string;
  agentThought: string;
  proposedPayment: RequestPaymentInput;
}

/**
 * Mock LLM Reasoner for Hackathon Demo.
 * Simulates LLM understanding user prompts and generating structured payment requests.
 */
export class MockLlm {
  public static parsePromptToScenario(
    scenarioKey: 'A' | 'B' | 'C' | string,
    customPrompt?: string,
    customAmount?: number
  ): LlmScenarioDefinition {
    const key = scenarioKey.toUpperCase();

    if (key === 'A' || key === 'ALLOW') {
      return {
        scenarioKey: 'A',
        userPrompt: customPrompt || 'Get the latest ML benchmark dataset for the research project.',
        agentThought:
          'User needs an ML benchmark dataset from ArXiv. Vendor "ArXiv Data Insights" is a verified research vendor. Amount is ₹1,499 within daily research budget.',
        proposedPayment: {
          vendor: 'ArXiv Data Insights',
          amount: customAmount || 1499.0,
          currency: 'INR',
          category: 'RESEARCH_PAPER',
          purpose: 'Download machine learning benchmark dataset for research project',
        },
      };
    }

    if (key === 'B' || key === 'HUMAN_APPROVAL') {
      return {
        scenarioKey: 'B',
        userPrompt: customPrompt || 'Subscribe to the annual Statista market research database for quantitative data.',
        agentThought:
          'User requires Statista premium dataset access. Vendor "Statista Market Research" is a verified vendor. Amount is ₹7,500, which exceeds the ₹5,000 auto-approve limit and requires human admin approval.',
        proposedPayment: {
          vendor: 'Statista Market Research',
          amount: customAmount || 7500.0,
          currency: 'INR',
          category: 'DATASET',
          purpose: 'Annual Statista market research database subscription access',
        },
      };
    }

    if (key === 'C' || key === 'BLOCK') {
      return {
        scenarioKey: 'C',
        userPrompt: customPrompt || 'Purchase an enterprise site license for global research database access.',
        agentThought:
          'User requested an enterprise research site license. Vendor "ArXiv Data Insights". Proposed amount is ₹25,000. Evaluating intent with AgentPay Policy Engine...',
        proposedPayment: {
          vendor: 'ArXiv Data Insights',
          amount: customAmount || 25000.0,
          currency: 'INR',
          category: 'RESEARCH_PAPER',
          purpose: 'Enterprise site license for global research database',
        },
      };
    }

    // Default fallback scenario A
    return {
      scenarioKey: 'A',
      userPrompt: customPrompt || 'Default research dataset procurement request.',
      agentThought: 'Parsing prompt into structured PaymentIntent payload.',
      proposedPayment: {
        vendor: 'ArXiv Data Insights',
        amount: customAmount || 1499.0,
        currency: 'INR',
        category: 'RESEARCH_PAPER',
        purpose: customPrompt || 'Default dataset procurement',
      },
    };
  }
}
