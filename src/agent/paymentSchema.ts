import { z } from 'zod';

/**
 * Zod Validation Schema for Agent Payment Requests.
 * STRICT: Disallows any malicious client/LLM-injected properties (such as 'decision', 'status', 'policy', 'budget', etc.).
 */
export const AgentPaymentRequestSchema = z
  .object({
    vendor: z.string().min(1, 'Vendor name is required'),
    amount: z.number().positive('Payment amount must be a positive number'),
    currency: z.string().default('INR'),
    category: z.string().min(1, 'Payment category is required'),
    purpose: z.string().min(1, 'Payment purpose is required'),
    idempotencyKey: z.string().optional(),
  })
  .strict({
    message: 'Unauthorized property in agent request payload. Malicious field injection blocked.',
  });

export type AgentPaymentRequestDTO = z.infer<typeof AgentPaymentRequestSchema>;
