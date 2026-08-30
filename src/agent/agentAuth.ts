import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export interface AuthenticatedAgentRequest extends Request {
  authenticatedAgent?: {
    id: string;
    name: string;
    role: string;
    apiKey: string;
    status: string;
  };
}

/**
 * Express Middleware: Authenticates Agent API Key from header 'x-agent-api-key'.
 * Binds server-side identity to req.authenticatedAgent.
 * Prevents LLM impersonation by overriding any agentId passed in body.
 */
export const requireAgentAuth = async (
  req: AuthenticatedAgentRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-agent-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing required header: x-agent-api-key',
    });
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { apiKey },
    });

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Agent API Key. Access denied.',
      });
    }

    if (agent.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: `Agent "${agent.name}" is currently ${agent.status.toLowerCase()} and cannot perform operations.`,
      });
    }

    req.authenticatedAgent = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      apiKey: agent.apiKey || apiKey,
      status: agent.status,
    };

    // FORCE IMPERSONATION PREVENTION: Override any agentId in body with authenticated DB identity
    if (req.body && typeof req.body === 'object') {
      req.body.agentId = agent.id;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Agent authentication error: ${error.message}`,
    });
  }
};
