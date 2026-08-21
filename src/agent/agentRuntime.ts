import { AgentScenarioInput, AgentScenarioResult, RequestPaymentOutput } from './agentTypes.js';
import { MockLlm } from './mockLlm.js';
import { PaymentTool } from './paymentTool.js';

export class AgentRuntime {
  /**
   * Runs an Agent Scenario (A, B, or C).
   * 1. LLM parses user prompt into structured PaymentIntent request.
   * 2. Agent invokes request_payment tool.
   * 3. Server authenticates agent & executes Policy Engine.
   * 4. Returns formatted Scenario Result.
   */
  public static async runScenario(
    authenticatedAgentId: string,
    input: AgentScenarioInput
  ): Promise<AgentScenarioResult> {
    // 1. LLM Reasoner parses user prompt
    const scenarioDef = MockLlm.parsePromptToScenario(
      input.scenario,
      input.prompt,
      input.customAmount
    );

    if (input.customVendor) {
      scenarioDef.proposedPayment.vendor = input.customVendor;
    }

    // 2. Agent invokes financial tool: request_payment
    const toolOutput: RequestPaymentOutput = await PaymentTool.execute(
      authenticatedAgentId,
      scenarioDef.proposedPayment
    );

    // 3. Format and return scenario result
    return {
      scenario: scenarioDef.scenarioKey,
      userPrompt: scenarioDef.userPrompt,
      agentThought: scenarioDef.agentThought,
      proposedPayment: scenarioDef.proposedPayment,
      toolOutput,
    };
  }
}
