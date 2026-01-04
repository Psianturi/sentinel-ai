import axios from 'axios';
import { ethers } from 'ethers';
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
  
  constructor() {
    this.mcpService = new MCPService();
    this.conversationHistory = new Map();
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
      response = this.handleGeneralQuery(message);
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
        reasoning = 'Fokus pada sBOND untuk yield stabil dengan sedikit eksposur emas sebagai lindung nilai inflasi.';
        break;
      case 'aggressive':
        allocation = { sGold: 70, sBond: 30 };
        strategy = 'Growth Oriented';
        reasoning = 'Alokasi tinggi ke sGOLD untuk potensi apresiasi harga dengan sBOND sebagai stabilizer.';
        break;
      case 'moderate':
      default:
        allocation = { sGold: 40, sBond: 60 };
        strategy = 'Balanced Growth';
        reasoning = 'Keseimbangan antara pertumbuhan (sGOLD) dan income (sBOND) untuk hasil optimal.';
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
      riskAssessment: `Profil ${riskProfile}: ${this.getRiskDescription(riskProfile)}`
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
      message: `📊 **Harga Real-Time dari Crypto.com MCP:**\n\n` +
        `🥇 **sGOLD (Emas):** $${marketData.goldPrice.toLocaleString()} per oz\n` +
        `   Perubahan 24j: ${marketData.goldChange24h >= 0 ? '+' : ''}${marketData.goldChange24h.toFixed(2)}%\n\n` +
        `📜 **sBOND:** $100 per unit (fixed)\n` +
        `   Yield: 5% APY\n\n` +
        `_Data diambil langsung dari Crypto.com Market Data Server_`,
      suggestions: [
        'Berapa nilai portfolio saya?',
        'Rekomendasikan investasi',
        'Saya ingin beli emas'
      ]
    };
  }

  private async handleBuyIntent(message: string): Promise<ChatResponse> {
    const marketData = await this.mcpService.getMarketData();
    
    // Extract amount from message (simplified)
    const amountMatch = message.match(/\$?(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 100;
    
    const goldAmount = amount / marketData.goldPrice;
    const bondAmount = amount / 100;
    
    return {
      message: `💰 **Simulasi Pembelian $${amount}:**\n\n` +
        `🥇 Jika sGOLD: ~${goldAmount.toFixed(4)} oz emas\n` +
        `📜 Jika sBOND: ${bondAmount.toFixed(0)} unit obligasi\n\n` +
        `**Rekomendasi AI:** Dengan harga emas saat ini ${marketData.goldChange24h >= 0 ? 'naik' : 'turun'} ` +
        `${Math.abs(marketData.goldChange24h).toFixed(2)}%, saya sarankan ` +
        `${marketData.goldChange24h >= 2 ? 'menunggu koreksi' : 'membeli sekarang'}.`,
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
        'Lanjutkan beli sGOLD',
        'Lanjutkan beli sBOND',
        'Bagi rata keduanya'
      ]
    };
  }

  private async handleSellIntent(message: string): Promise<ChatResponse> {
    return {
      message: `📤 **Penarikan Aset:**\n\n` +
        `Anda bisa menarik aset dari vault kapan saja.\n\n` +
        `⚠️ **Perhatian:**\n` +
        `- Yield yang belum diklaim akan tetap tersimpan\n` +
        `- Tidak ada penalti penarikan\n` +
        `- Proses instant di Cronos zkEVM\n\n` +
        `Berapa jumlah yang ingin Anda tarik?`,
      suggestions: [
        'Tarik semua sGOLD',
        'Tarik 50% sBOND',
        'Cek yield dulu'
      ]
    };
  }

  private async handlePaymentIntent(message: string): Promise<ChatResponse> {
    return {
      message: `💳 **Pembayaran dengan RWA:**\n\n` +
        `Sentinel AI dapat membantu Anda membayar menggunakan aset sGOLD atau sBOND.\n\n` +
        `**Cara kerja:**\n` +
        `1. Scan QR merchant\n` +
        `2. AI konversi aset ke nilai pembayaran\n` +
        `3. Transaksi otomatis via x402\n\n` +
        `✨ **Invisible Mode:** Aktifkan untuk pembayaran otomatis di bawah $10\n\n` +
        `Apakah Anda ingin melakukan pembayaran sekarang?`,
      action: {
        type: 'PAYMENT_READY',
        data: {
          supportedTokens: ['sGOLD', 'sBOND'],
          x402Enabled: true
        }
      },
      suggestions: [
        'Scan QR untuk bayar',
        'Aktifkan Invisible Mode',
        'Lihat riwayat pembayaran'
      ]
    };
  }

  private async handleYieldQuery(message: string): Promise<ChatResponse> {
    return {
      message: `📈 **Yield & Keuntungan:**\n\n` +
        `🥇 **sGOLD Yield:**\n` +
        `   - Rate: 0.5% APY (accelerated untuk demo)\n` +
        `   - Pending: $2.50\n` +
        `   - Source: Simulasi apresiasi emas\n\n` +
        `📜 **sBOND Yield:**\n` +
        `   - Rate: 5% APY\n` +
        `   - Pending: $10.00\n` +
        `   - Source: Bunga obligasi\n\n` +
        `💵 **Total Pending:** $12.50\n\n` +
        `Apakah Anda ingin klaim yield sekarang?`,
      action: {
        type: 'YIELD_INFO',
        data: {
          sGoldYield: 2.50,
          sBondYield: 10.00,
          totalPending: 12.50
        }
      },
      suggestions: [
        'Klaim semua yield',
        'Auto-compound ON',
        'Gunakan yield untuk bayar'
      ]
    };
  }

  private async handlePortfolioQuery(message: string): Promise<ChatResponse> {
    return {
      message: `💼 **Portfolio Anda:**\n\n` +
        `🥇 **sGOLD:** 50 oz ($100,000)\n` +
        `📜 **sBOND:** 1,000 unit ($100,000)\n\n` +
        `📊 **Total Nilai:** $200,000\n` +
        `📈 **Yield Earned:** $150.00\n` +
        `⏳ **Pending Yield:** $12.50\n\n` +
        `**Alokasi:**\n` +
        `🥇 sGOLD: 50% | 📜 sBOND: 50%\n\n` +
        `_Rebalancing terakhir: 3 hari lalu_`,
      suggestions: [
        'Analisis portfolio detail',
        'Rebalance portfolio',
        'Tambah investasi'
      ]
    };
  }

  private async handleRecommendationQuery(message: string): Promise<ChatResponse> {
    const marketData = await this.mcpService.getMarketData();
    
    return {
      message: `🤖 **Rekomendasi AI Sentinel:**\n\n` +
        `Berdasarkan data real-time dari Crypto.com MCP:\n\n` +
        `📊 **Kondisi Pasar:**\n` +
        `- Emas: ${marketData.goldChange24h >= 0 ? '📈 Bullish' : '📉 Bearish'} (${marketData.goldChange24h.toFixed(2)}%)\n` +
        `- Obligasi: Stabil\n\n` +
        `💡 **Strategi yang Disarankan:**\n` +
        `${marketData.goldChange24h >= 0 
          ? 'Hold sGOLD Anda, momentum masih positif. Pertimbangkan taking profit 10% jika naik >5%.'
          : 'Peluang akumulasi sGOLD di harga lebih rendah. DCA strategy recommended.'}\n\n` +
        `**Risk Level:** Moderate\n` +
        `**Time Horizon:** 3-6 bulan`,
      suggestions: [
        'Terapkan strategi ini',
        'Lihat alternatif',
        'Jelaskan lebih detail'
      ]
    };
  }

  private handleGeneralQuery(message: string): ChatResponse {
    return {
      message: `👋 Halo! Saya **Sentinel AI**, asisten finansial Anda.\n\n` +
        `Saya bisa membantu Anda:\n` +
        `• 📊 Cek harga aset real-time\n` +
        `• 💰 Beli/jual sGOLD & sBOND\n` +
        `• 📈 Analisis portfolio\n` +
        `• 💳 Pembayaran dengan aset RWA\n` +
        `• 🤖 Rekomendasi investasi AI\n\n` +
        `Apa yang bisa saya bantu hari ini?`,
      suggestions: [
        'Berapa harga emas?',
        'Lihat portfolio saya',
        'Rekomendasikan investasi'
      ]
    };
  }

  private generatePortfolioRecommendation(
    sGoldValue: number,
    sBondValue: number,
    totalValue: number
  ): string {
    const goldRatio = sGoldValue / totalValue;
    
    if (goldRatio > 0.7) {
      return 'Portfolio terlalu berat di emas. Pertimbangkan rebalancing ke sBOND untuk yield lebih stabil.';
    } else if (goldRatio < 0.3) {
      return 'Portfolio terlalu defensif. Tambah eksposur sGOLD untuk potensi apresiasi.';
    }
    return 'Alokasi portfolio seimbang. Pertahankan strategi saat ini.';
  }

  private assessRiskLevel(goldRatio: number): string {
    if (goldRatio > 0.6) return 'Tinggi';
    if (goldRatio > 0.4) return 'Sedang';
    return 'Rendah';
  }

  private getRiskDescription(riskProfile: string): string {
    switch (riskProfile.toLowerCase()) {
      case 'conservative':
        return 'Prioritas keamanan modal dengan pendapatan stabil.';
      case 'aggressive':
        return 'Toleransi volatilitas tinggi untuk potensi return maksimal.';
      default:
        return 'Keseimbangan antara pertumbuhan dan stabilitas.';
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
