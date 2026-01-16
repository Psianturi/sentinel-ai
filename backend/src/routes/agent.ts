import { Router, Request, Response } from 'express';
import { SentinelAgent } from '../services/SentinelAgent';

const router = Router();
const agent = new SentinelAgent();

/**
 * POST /api/agent/chat
 * Send a message to the AI agent
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await agent.processMessage(message, userId);
    res.json(response);
  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});


router.post('/analyze-portfolio', async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const analysis = await agent.analyzePortfolio(walletAddress);
    res.json(analysis);
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze portfolio' });
  }
});


router.post('/recommend-investment', async (req: Request, res: Response) => {
  try {
    const { userId, riskProfile, amount } = req.body;
    
    const recommendation = await agent.getInvestmentRecommendation(
      riskProfile || 'moderate',
      amount || 0
    );
    res.json(recommendation);
  } catch (error) {
    console.error('Investment recommendation error:', error);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

/**
 * GET /api/agent/market-insights
 * Get real-time market insights from MCP
 */
router.get('/market-insights', async (req: Request, res: Response) => {
  try {
    const insights = await agent.getMarketInsights();
    res.json(insights);
  } catch (error) {
    console.error('Market insights error:', error);
    res.status(500).json({ error: 'Failed to get market insights' });
  }
});

export { router as agentRouter };
