import axios from 'axios';
import { ethers } from 'ethers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient as createCdcClient } from '@crypto.com/ai-agent-client';
import { MCPService } from './MCPService';

interface ChatResponse {
  message: string;
  action?: {
    type: string;
    data: any;
  };
  suggestions?: string[];
}

interface PortfolioAnalysis {
  totalValue: number;
  allocation: {
    sGold: { amount: number; percentage: number; value: number };
    sBond: { amount: number; percentage: number; value: number };
  };
  yield: {
    pending: number;
    earned: number;
    apy: number;
  };
  recommendation: string;
  riskLevel: string;
}

interface InvestmentRecommendation {
  strategy: string;
  allocation: {
    sGold: number;
    sBond: number;
  };
  reasoning: string;
  expectedYield: number;
  riskAssessment: string;
}

/**
 * SentinelAgent - AI-powered financial assistant
 * Processes user messages and provides intelligent responses
 */
export class SentinelAgent {
  private mcpService: MCPService;
  private conversationHistory: Map<string, Array<{ role: string; content: string }>>;
  private genAI: GoogleGenerativeAI | null;
  private geminiModel: string;
  private cdcClient: { agent: { generateQuery: (query: string) => Promise<any> } } | null;
  private cdcQueryOptions: any | null;
  
  constructor() {
    this.mcpService = new MCPService();
    this.conversationHistory = new Map();

    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;

    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    // Crypto.com AI Agent Client requires an OpenAI API key per its QueryOptions schema.
    // We enable it only when OPENAI_API_KEY is present to avoid false claims / broken calls.
    this.cdcClient = null;
    this.cdcQueryOptions = null;
    if (process.env.OPENAI_API_KEY) {
      this.cdcQueryOptions = {
        openAI: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.CDC_OPENAI_MODEL || 'gpt-4o'
        },
        chainId: Number(process.env.CRONOS_CHAIN_ID || 240),
        explorerKeys: {
          cronosMainnetKey: process.env.CRONOS_MAINNET_EXPLORER_API_KEY,
          cronosTestnetKey: process.env.CRONOS_TESTNET_EXPLORER_API_KEY,
          cronosZkEvmKey: process.env.CRONOS_ZKEVM_EXPLORER_API_KEY,
          cronosZkEvmTestnetKey: process.env.CRONOS_ZKEVM_TESTNET_EXPLORER_API_KEY
        },
        signerAppUrl: process.env.CDC_SIGNER_APP_URL,
        customRPC: process.env.CRONOS_ZKEVM_TESTNET_RPC,
        context: []
      };

      this.cdcClient = createCdcClient(this.cdcQueryOptions);
    }
  }

  /**
   * Process a user message and generate intelligent response
   */
  async processMessage(message: string, userId?: string): Promise<ChatResponse> {
    const lowerMessage = message.toLowerCase();
    
    // Get conversation history for context
    const history = this.getConversationHistory(userId || 'anonymous');
    
    // Add user message to history
    history.push({ role: 'user', content: message });
    
    // Detect intent and generate response
    let response: ChatResponse;
    
    if (this.containsAny(lowerMessage, ['harga', 'price', 'berapa', 'nilai'])) {
      response = await this.handlePriceQuery(message);
    } else if (this.containsAny(lowerMessage, ['beli', 'buy', 'invest', 'investasi'])) {
      response = await this.handleBuyIntent(message);
    } else if (this.containsAny(lowerMessage, ['jual', 'sell', 'withdraw', 'tarik'])) {
      response = await this.handleSellIntent(message);
    } else if (this.containsAny(lowerMessage, ['bayar', 'pay', 'transfer', 'kirim'])) {
      response = await this.handlePaymentIntent(message);
    } else if (this.containsAny(lowerMessage, ['yield', 'bunga', 'profit', 'keuntungan'])) {
      response = await this.handleYieldQuery(message);
    } else if (this.containsAny(lowerMessage, ['portfolio', 'saldo', 'balance', 'aset'])) {
      response = await this.handlePortfolioQuery(message);
    } else if (this.containsAny(lowerMessage, ['rekomendasi', 'recommend', 'saran', 'advice'])) {
      response = await this.handleRecommendationQuery(message);
    } else {
      response = await this.handleGeneralQuery(message, history);
    }
    
    // Add assistant response to history
    history.push({ role: 'assistant', content: response.message });
    
    // Keep history limited to last 20 messages
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    return response;
  }

  /**
   * Analyze user's portfolio
   */
  async analyzePortfolio(walletAddress: string): Promise<PortfolioAnalysis> {
    // Get market data from MCP
    const marketData = await this.mcpService.getMarketData();
    
    // TODO: Fetch actual balances from blockchain
    // For demo, using mock data
    const mockSGoldBalance = 50;
    const mockSBondBalance = 1000;
    
    const sGoldValue = mockSGoldBalance * marketData.goldPrice;
    const sBondValue = mockSBondBalance * 100; // $100 per bond
    const totalValue = sGoldValue + sBondValue;
    
    return {
      totalValue,
      allocation: {
        sGold: {
          amount: mockSGoldBalance,
          percentage: (sGoldValue / totalValue) * 100,
          value: sGoldValue
        },
        sBond: {
          amount: mockSBondBalance,
          percentage: (sBondValue / totalValue) * 100,
          value: sBondValue
        }
      },
      yield: {
        pending: 12.5, // Mock: $12.50 pending yield
        earned: 150.0, // Mock: $150 total earned
        apy: 4.25 // Blended APY
      },
      recommendation: this.generatePortfolioRecommendation(sGoldValue, sBondValue, totalValue),
      riskLevel: this.assessRiskLevel(sGoldValue / totalValue)
    };
  }

  /**
   * Get investment recommendation based on risk profile
   */
  async getInvestmentRecommendation(
    riskProfile: string,
    amount: number
  ): Promise<InvestmentRecommendation> {
    const marketData = await this.mcpService.getMarketData();
    
    let allocation: { sGold: number; sBond: number };
    let strategy: string;
    let reasoning: string;
    
    switch (riskProfile.toLowerCase()) {
      case 'conservative':
        allocation = { sGold: 20, sBond: 80 };
        strategy = 'Capital Preservation';
        reasoning = 'Focus on sBOND for stable yield with a small gold allocation as an inflation hedge.';
        break;
      case 'aggressive':
        allocation = { sGold: 70, sBond: 30 };
        strategy = 'Growth Oriented';
        reasoning = 'Higher allocation to sGOLD for potential price appreciation, with sBOND as a stabilizer.';
        break;
      case 'moderate':
      default:
        allocation = { sGold: 40, sBond: 60 };
        strategy = 'Balanced Growth';
        reasoning = 'Balanced mix of growth (sGOLD) and income (sBOND) for a more resilient outcome.';
    }
    
    // Calculate expected yield
    const goldYield = (allocation.sGold / 100) * 0.5; // 0.5% from gold
    const bondYield = (allocation.sBond / 100) * 5.0; // 5% from bonds
    const expectedYield = goldYield + bondYield;
    
    return {
      strategy,
      allocation,
      reasoning,
      expectedYield,
      riskAssessment: `Profile ${riskProfile}: ${this.getRiskDescription(riskProfile)}`
    };
  }

  /**
   * Get market insights from MCP
   */
  async getMarketInsights(): Promise<any> {
    const marketData = await this.mcpService.getMarketData();
    
    return {
      timestamp: new Date().toISOString(),
      gold: {
        price: marketData.goldPrice,
        change24h: marketData.goldChange24h,
        trend: marketData.goldChange24h >= 0 ? 'bullish' : 'bearish'
      },
      sentiment: this.analyzeMarketSentiment(marketData),
      recommendation: this.generateMarketRecommendation(marketData)
    };
  }

  // ========== Private Helper Methods ==========

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private getConversationHistory(userId: string): Array<{ role: string; content: string }> {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    return this.conversationHistory.get(userId)!;
  }

  private async handlePriceQuery(message: string): Promise<ChatResponse> {
    const marketData = await this.mcpService.getMarketData();
    
    return {
      message: `📊 **Real-Time Prices from Crypto.com MCP:**\n\n` +
        `🥇 **sGOLD (Gold):** $${marketData.goldPrice.toLocaleString()} per oz\n` +
        `   24h change: ${marketData.goldChange24h >= 0 ? '+' : ''}${marketData.goldChange24h.toFixed(2)}%\n\n` +
        `📜 **sBOND:** $100 per unit (fixed)\n` +
        `   Yield: 5% APY\n\n` +
        `_Data sourced from Crypto.com Market Data MCP_`,
      suggestions: [
        "What's my portfolio value?",
        'Recommend an investment plan',
        'I want to buy gold'
      ]
    };
  }

  private async handleGeneralQuery(
    message: string,
    history: Array<{ role: string; content: string }>
  ): Promise<ChatResponse> {
    // Update CDC context from recent conversation, if enabled.
    const recent = history.slice(Math.max(0, history.length - 8));
    if (this.cdcQueryOptions) {
      this.cdcQueryOptions.context = recent.map(m => ({
        role: m.role,
        content: m.content
      }));
    }

    // For hybrid mode: use Gemini for natural language, optionally enrich with CDC agent output.
    const [geminiText, cdcText] = await Promise.all([
      this.tryGenerateWithGemini(message, recent),
      this.tryGenerateWithCdcAgent(message)
    ]);

    if (geminiText) {
      const combined = cdcText
        ? `${geminiText}\n\n---\n**Crypto.com Agent Insight:**\n${cdcText}`
        : geminiText;

      return {
        message: combined,
        suggestions: [
          "What's my portfolio value?",
          'Recommend an investment plan',
          'I want to buy gold'
        ]
      };
    }

    if (cdcText) {
      return {
        message: cdcText,
        suggestions: [
          "What's my portfolio value?",
          'Recommend an investment plan',
          'I want to buy gold'
        ]
      };
    }

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.geminiModel });

        const context = recent
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');

        const prompt =
          `You are Sentinel AI, an AI-powered financial guardian on Cronos zkEVM.\n` +
          `Be concise, practical, and friendly.\n` +
          `If the user asks about prices, portfolio, buying, selling, payments, or yield, answer in a way that fits the app context.\n` +
          `Do not claim you executed an on-chain transaction unless explicitly confirmed by the backend.\n\n` +
          `Conversation context:\n${context}\n\n` +
          `User: ${message}\n` +
          `Assistant:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return {
          message: text,
          suggestions: [
            "What's my portfolio value?",
            'Recommend an investment plan',
            'I want to buy gold'
          ]
        };
      } catch (error) {
        console.error('Gemini generation error:', error);
      }
    }

    return {
      message:
        'I can help you invest in RWAs on Cronos zkEVM. Do you want to focus on gold (sGOLD) or bonds (sBOND)?\n' +
        'Try: “gold price now”, “recommend an investment plan”, or “check my portfolio”.',
      suggestions: [
        "What's sGOLD price now?",
        'Check my portfolio',
        'Recommend an investment plan'
      ]
    };
  }

  private async tryGenerateWithGemini(
    message: string,
    recent: Array<{ role: string; content: string }>
  ): Promise<string | null> {
    if (!this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.geminiModel });
      const context = recent
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt =
        `You are Sentinel AI, an AI-powered financial guardian on Cronos zkEVM.\n` +
        `Be concise, practical, and friendly.\n` +
        `If the user asks about prices, portfolio, buying, selling, payments, or yield, answer in a way that fits the app context.\n` +
        `Do not claim you executed an on-chain transaction unless explicitly confirmed by the backend.\n\n` +
        `Conversation context:\n${context}\n\n` +
        `User: ${message}\n` +
        `Assistant:`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini generation error:', error);
      return null;
    }
  }

  private async tryGenerateWithCdcAgent(message: string): Promise<string | null> {
    if (!this.cdcClient) return null;

    try {
      const response = await this.cdcClient.agent.generateQuery(message);
      if (!response) return null;

      // Try common response shapes.
      if (typeof response.message === 'string' && response.message.trim()) {
        return response.message.trim();
      }

      if (Array.isArray(response.results) && response.results.length > 0) {
        const lines = response.results
          .map((r: any) => (r?.message ? `- ${r.message}` : null))
          .filter(Boolean);
        if (lines.length > 0) return lines.join('\n');
      }

      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error('CDC agent client error:', error);
      return null;
    }
  }

  private async handleBuyIntent(message: string): Promise<ChatResponse> {
    const marketData = await this.mcpService.getMarketData();
    
    // Extract amount from message (simplified)
    const amountMatch = message.match(/\$?(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 100;
    
    const goldAmount = amount / marketData.goldPrice;
    const bondAmount = amount / 100;
    
    return {
      message: `💰 **Buy Simulation ($${amount}):**\n\n` +
        `🥇 If sGOLD: ~${goldAmount.toFixed(4)} oz of gold\n` +
        `📜 If sBOND: ${bondAmount.toFixed(0)} bond units\n\n` +
        `**AI Suggestion:** With gold ${marketData.goldChange24h >= 0 ? 'up' : 'down'} ` +
        `${Math.abs(marketData.goldChange24h).toFixed(2)}% over the last 24h, I suggest ` +
        `${marketData.goldChange24h >= 2 ? 'waiting for a pullback' : 'buying now'}.`,
      action: {
        type: 'BUY_PREVIEW',
        data: {
          amount,
          goldAmount,
          bondAmount,
          currentGoldPrice: marketData.goldPrice
        }
      },
      suggestions: [
        'Proceed to buy sGOLD',
        'Proceed to buy sBOND',
        'Split 50/50'
      ]
    };
  }

  private async handleSellIntent(message: string): Promise<ChatResponse> {
    return {
      message: `📤 **Withdraw Assets:**\n\n` +
        `You can withdraw from the vault at any time.\n\n` +
        `⚠️ **Notes:**\n` +
        `- Unclaimed yield remains available\n` +
        `- No withdrawal penalty\n` +
        `- Near-instant finality on Cronos zkEVM\n\n` +
        `How much would you like to withdraw?`,
      suggestions: [
        'Withdraw all sGOLD',
        'Withdraw 50% sBOND',
        'Check yield first'
      ]
    };
  }

  private async handlePaymentIntent(message: string): Promise<ChatResponse> {
    return {
      message: `💳 **Pay with RWAs:**\n\n` +
        `Sentinel AI can help you pay using sGOLD or sBOND.\n\n` +
        `**How it works:**\n` +
        `1. Scan the merchant QR\n` +
        `2. AI converts assets into the payment value\n` +
        `3. Automatic settlement via x402\n\n` +
        `✨ **Invisible Mode:** Enable for auto-payments under $10\n\n` +
        `Do you want to make a payment now?`,
      action: {
        type: 'PAYMENT_READY',
        data: {
          supportedTokens: ['sGOLD', 'sBOND'],
          x402Enabled: true
        }
      },
      suggestions: [
        'Scan QR to pay',
        'Enable Invisible Mode',
        'View payment history'
      ]
    };
  }

  private async handleYieldQuery(message: string): Promise<ChatResponse> {
    return {
      message: `📈 **Yield & Earnings:**\n\n` +
        `🥇 **sGOLD Yield:**\n` +
        `   - Rate: 0.5% APY (accelerated for demo)\n` +
        `   - Pending: $2.50\n` +
        `   - Source: Simulated gold appreciation\n\n` +
        `📜 **sBOND Yield:**\n` +
        `   - Rate: 5% APY\n` +
        `   - Pending: $10.00\n` +
        `   - Source: Bond interest\n\n` +
        `💵 **Total Pending:** $12.50\n\n` +
        `Do you want to claim yield now?`,
      action: {
        type: 'YIELD_INFO',
        data: {
          sGoldYield: 2.50,
          sBondYield: 10.00,
          totalPending: 12.50
        }
      },
      suggestions: [
        'Claim all yield',
        'Turn auto-compound ON',
        'Use yield to pay'
      ]
    };
  }

  private async handlePortfolioQuery(message: string): Promise<ChatResponse> {
    return {
      message: `💼 **Your Portfolio:**\n\n` +
        `🥇 **sGOLD:** 50 oz ($100,000)\n` +
        `📜 **sBOND:** 1,000 unit ($100,000)\n\n` +
        `📊 **Total Nilai:** $200,000\n` +
        `📈 **Yield Earned:** $150.00\n` +
        `⏳ **Pending Yield:** $12.50\n\n` +
        `**Allocation:**\n` +
        `🥇 sGOLD: 50% | 📜 sBOND: 50%\n\n` +
        `_Last rebalanced: 3 days ago_`,
      suggestions: [
        'Run detailed portfolio analysis',
        'Rebalance portfolio',
        'Add investment'
      ]
    };
  }

  private async handleRecommendationQuery(message: string): Promise<ChatResponse> {
    const marketData = await this.mcpService.getMarketData();
    
    return {
      message: `🤖 **Sentinel AI Recommendation:**\n\n` +
        `Based on real-time data from Crypto.com MCP:\n\n` +
        `📊 **Market Conditions:**\n` +
        `- Gold: ${marketData.goldChange24h >= 0 ? '📈 Bullish' : '📉 Bearish'} (${marketData.goldChange24h.toFixed(2)}%)\n` +
        `- Bonds: Stable\n\n` +
        `💡 **Suggested Strategy:**\n` +
        `${marketData.goldChange24h >= 0 
          ? 'Hold your sGOLD—momentum is still positive. Consider taking 10% profits if it rises >5%.'
          : 'Potential accumulation opportunity for sGOLD at lower prices. DCA is recommended.'}\n\n` +
        `**Risk Level:** Moderate\n` +
        `**Time Horizon:** 3–6 months`,
      suggestions: [
        'Apply this strategy',
        'See alternatives',
        'Explain in more detail'
      ]
    };
  }

  // Legacy handleGeneralQuery(message) removed in favor of async Gemini-backed version.

  private generatePortfolioRecommendation(
    sGoldValue: number,
    sBondValue: number,
    totalValue: number
  ): string {
    const goldRatio = sGoldValue / totalValue;
    
    if (goldRatio > 0.7) {
      return 'Your portfolio is too heavy in gold. Consider rebalancing into sBOND for more stable yield.';
    } else if (goldRatio < 0.3) {
      return 'Your portfolio is too defensive. Increase sGOLD exposure for potential appreciation.';
    }
    return 'Your allocation looks balanced. Maintain the current strategy.';
  }

  private assessRiskLevel(goldRatio: number): string {
    if (goldRatio > 0.6) return 'High';
    if (goldRatio > 0.4) return 'Medium';
    return 'Low';
  }

  private getRiskDescription(riskProfile: string): string {
    switch (riskProfile.toLowerCase()) {
      case 'conservative':
        return 'Prioritizes capital preservation with stable income.';
      case 'aggressive':
        return 'High volatility tolerance for maximum return potential.';
      default:
        return 'Balances growth and stability.';
    }
  }

  private analyzeMarketSentiment(marketData: any): string {
    if (marketData.goldChange24h > 2) return 'Very Bullish';
    if (marketData.goldChange24h > 0) return 'Bullish';
    if (marketData.goldChange24h > -2) return 'Neutral';
    return 'Bearish';
  }

  private generateMarketRecommendation(marketData: any): string {
    if (marketData.goldChange24h > 2) {
      return 'Consider taking partial profits on sGOLD positions.';
    }
    if (marketData.goldChange24h < -2) {
      return 'Potential accumulation opportunity for sGOLD.';
    }
    return 'Hold current positions. Market in consolidation phase.';
  }
}
