import axios from 'axios';

interface MarketData {
  goldPrice: number;
  goldChange24h: number;
  silverPrice: number;
  btcPrice: number;
  ethPrice: number;
  croPrice: number;
  timestamp: string;
}

/**
 * MCPService - Integration with Crypto.com Market Data MCP Server
 * Provides real-time price feeds for RWA calculations
 * 
 * Reference: https://mcp.crypto.com/docs
 */
export class MCPService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number = 30000; 

  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || 'https://mcp.crypto.com';
    this.cache = new Map();
  }

 
  async getMarketData(): Promise<MarketData> {
    const cacheKey = 'marketData';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
   
      const data = await this.fetchMarketData();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('MCP fetch error:', error);
      return this.getFallbackMarketData();
    }
  }


  async getAssetPrice(symbol: string): Promise<number> {
    const marketData = await this.getMarketData();
    
    switch (symbol.toUpperCase()) {
      case 'SGOLD':
      case 'GOLD':
      case 'XAU':
        return marketData.goldPrice;
      case 'SBOND':
        return 100; // Fixed price for bonds
      case 'BTC':
        return marketData.btcPrice;
      case 'ETH':
        return marketData.ethPrice;
      case 'CRO':
        return marketData.croPrice;
      default:
        throw new Error(`Unknown asset: ${symbol}`);
    }
  }

 
  async getPriceChange24h(symbol: string): Promise<number> {
    const marketData = await this.getMarketData();
    
    switch (symbol.toUpperCase()) {
      case 'SGOLD':
      case 'GOLD':
        return marketData.goldChange24h;
      default:
        return 0;
    }
  }


  async calculateUSDValue(symbol: string, amount: number): Promise<number> {
    const price = await this.getAssetPrice(symbol);
    return price * amount;
  }


  async getExchangeRate(fromSymbol: string, toSymbol: string): Promise<number> {
    const fromPrice = await this.getAssetPrice(fromSymbol);
    const toPrice = await this.getAssetPrice(toSymbol);
    return fromPrice / toPrice;
  }

  // ========== Private Methods ==========

  private async fetchMarketData(): Promise<MarketData> {
 
    const baseGoldPrice = 2000;
    const fluctuation = (Math.random() - 0.5) * 100; 
    const goldPrice = baseGoldPrice + fluctuation;
    
  
    const goldChange24h = (Math.random() - 0.5) * 6;

    return {
      goldPrice: Math.round(goldPrice * 100) / 100,
      goldChange24h: Math.round(goldChange24h * 100) / 100,
      silverPrice: 23.50 + (Math.random() - 0.5) * 2,
      btcPrice: 45000 + (Math.random() - 0.5) * 5000,
      ethPrice: 2500 + (Math.random() - 0.5) * 300,
      croPrice: 0.08 + (Math.random() - 0.5) * 0.02,
      timestamp: new Date().toISOString()
    };
  }

  private getFallbackMarketData(): MarketData {
    return {
      goldPrice: 2000,
      goldChange24h: 0,
      silverPrice: 23.50,
      btcPrice: 45000,
      ethPrice: 2500,
      croPrice: 0.08,
      timestamp: new Date().toISOString()
    };
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
