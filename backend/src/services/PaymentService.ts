import { ethers } from 'ethers';
import { MCPService } from './MCPService';

interface PaymentParams {
  userAddress: string;
  merchantAddress: string;
  amount: number;
  token: string;
  memo: string;
}

interface SubscriptionParams {
  userAddress: string;
  merchantAddress: string;
  amount: number;
  token: string;
  interval: string;
  description: string;
}

interface QRCodeParams {
  merchantAddress: string;
  amount?: number;
  token?: string;
  memo?: string;
}

interface PaymentResult {
  success: boolean;
  txHash?: string;
  message: string;
  details?: {
    from: string;
    to: string;
    amount: number;
    token: string;
    usdValue: number;
    timestamp: string;
  };
}

interface PaymentHistory {
  payments: Array<{
    txHash: string;
    from: string;
    to: string;
    amount: string;
    token: string;
    memo: string;
    timestamp: string;
  }>;
  total: number;
}

/**
 * PaymentService - Handles x402 payments and RWA transactions
 * Integrates with Cronos x402 Facilitator for programmatic payments
 * 
 * Reference: https://docs.cronos.org/cronos-x402-facilitator/introduction
 */
export class PaymentService {
  private provider: ethers.JsonRpcProvider;
  private mcpService: MCPService;
  private facilitatorUrl: string;

  // Mock payment history for demo
  private paymentHistory: Map<string, any[]>;

  constructor() {
    const rpcUrl = process.env.CRONOS_ZKEVM_TESTNET_RPC || 'https://rpc-zkevm-t0.cronos.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.mcpService = new MCPService();
    this.facilitatorUrl = process.env.X402_FACILITATOR_URL || '';
    this.paymentHistory = new Map();
  }

  /**
   * Execute a payment using RWA tokens
   * Uses x402 Facilitator for gasless, programmatic payments
   */
  async executePayment(params: PaymentParams): Promise<PaymentResult> {
    const { userAddress, merchantAddress, amount, token, memo } = params;

    try {
      // Get current price from MCP
      const tokenPrice = await this.mcpService.getAssetPrice(token);
      const usdValue = amount * tokenPrice;

      // Calculate token amount needed
      const tokenAmount = amount; // Already in token units for this demo

      // TODO: Implement actual x402 Facilitator integration
      // const facilitatorClient = new FacilitatorClient({
      //   url: this.facilitatorUrl,
      //   apiKey: process.env.X402_API_KEY
      // });
      // 
      // const tx = await facilitatorClient.executePayment({
      //   from: userAddress,
      //   to: merchantAddress,
      //   token: token === 'sGOLD' ? process.env.SGOLD_CONTRACT_ADDRESS : process.env.SBOND_CONTRACT_ADDRESS,
      //   amount: ethers.parseEther(tokenAmount.toString()),
      //   memo
      // });

      // For demo, simulate successful payment
      const txHash = '0x' + Math.random().toString(16).slice(2).padEnd(64, '0');
      const timestamp = new Date().toISOString();

      // Store in history
      this.addToHistory(userAddress, {
        txHash,
        from: userAddress,
        to: merchantAddress,
        amount: tokenAmount.toString(),
        token,
        memo,
        timestamp
      });

      return {
        success: true,
        txHash,
        message: `Payment of ${tokenAmount} ${token} ($${usdValue.toFixed(2)}) sent successfully`,
        details: {
          from: userAddress,
          to: merchantAddress,
          amount: tokenAmount,
          token,
          usdValue,
          timestamp
        }
      };
    } catch (error) {
      console.error('Payment execution error:', error);
      return {
        success: false,
        message: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Parse QR code data for payment
   * Expected format: sentinel:ADDRESS:AMOUNT:TOKEN:MEMO
   */
  parseQRCode(qrData: string): {
    merchantAddress: string;
    amount: number;
    token?: string;
    memo?: string;
  } {
    try {
      // Check if it's a Sentinel QR format
      if (qrData.startsWith('sentinel:')) {
        const parts = qrData.split(':');
        return {
          merchantAddress: parts[1],
          amount: parseFloat(parts[2]) || 0,
          token: parts[3] || 'sGOLD',
          memo: parts[4] || ''
        };
      }

      // Try parsing as JSON
      const parsed = JSON.parse(qrData);
      return {
        merchantAddress: parsed.address || parsed.to || parsed.merchant,
        amount: parsed.amount || 0,
        token: parsed.token || 'sGOLD',
        memo: parsed.memo || parsed.description || ''
      };
    } catch {
      // Assume it's just an address
      return {
        merchantAddress: qrData,
        amount: 0,
        token: 'sGOLD',
        memo: ''
      };
    }
  }

  /**
   * Generate QR code data for receiving payment
   */
  generateQRCode(params: QRCodeParams): string {
    const { merchantAddress, amount, token, memo } = params;
    
    // Sentinel QR format: sentinel:ADDRESS:AMOUNT:TOKEN:MEMO
    const parts = [
      'sentinel',
      merchantAddress,
      amount?.toString() || '0',
      token || 'sGOLD',
      memo || ''
    ];

    return parts.join(':');
  }

  /**
   * Create a subscription (recurring payment)
   * Uses x402 for programmatic recurring payments
   */
  async createSubscription(params: SubscriptionParams): Promise<{
    success: boolean;
    subscriptionId?: string;
    message: string;
    nextPayment?: string;
  }> {
    const { userAddress, merchantAddress, amount, token, interval, description } = params;

    try {
      // Calculate next payment date
      const nextPayment = this.calculateNextPayment(interval);

      // TODO: Implement actual x402 subscription
      // This would register with the Facilitator for recurring payments

      const subscriptionId = 'sub_' + Math.random().toString(36).slice(2, 11);

      return {
        success: true,
        subscriptionId,
        message: `Subscription created: ${description}`,
        nextPayment: nextPayment.toISOString()
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      return {
        success: false,
        message: `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(
    address: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaymentHistory> {
    // Get from local cache/mock
    const history = this.paymentHistory.get(address) || [];
    
    // In production, fetch from blockchain/indexer
    // const vaultContract = new ethers.Contract(
    //   process.env.SENTINEL_VAULT_ADDRESS!,
    //   VAULT_ABI,
    //   this.provider
    // );
    // const historyLength = await vaultContract.getPaymentHistoryLength();

    const paginatedHistory = history.slice(offset, offset + limit);

    return {
      payments: paginatedHistory,
      total: history.length
    };
  }

  /**
   * Estimate payment conversion
   * Convert RWA token to stablecoin value
   */
  async estimatePayment(
    amount: number,
    fromToken: string,
    toToken: string
  ): Promise<{
    fromAmount: number;
    fromToken: string;
    toAmount: number;
    toToken: string;
    exchangeRate: number;
    priceImpact: number;
  }> {
    const fromPrice = await this.mcpService.getAssetPrice(fromToken);
    const toPrice = toToken === 'USDC' || toToken === 'USDT' ? 1 : await this.mcpService.getAssetPrice(toToken);
    
    const exchangeRate = fromPrice / toPrice;
    const toAmount = amount * exchangeRate;

    return {
      fromAmount: amount,
      fromToken,
      toAmount,
      toToken,
      exchangeRate,
      priceImpact: 0.1 // Mock: 0.1% slippage
    };
  }

  // ========== Private Helper Methods ==========

  private calculateNextPayment(interval: string): Date {
    const now = new Date();
    switch (interval.toLowerCase()) {
      case 'daily':
        return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      default:
        return new Date(now.setDate(now.getDate() + 30));
    }
  }

  private addToHistory(address: string, payment: any): void {
    if (!this.paymentHistory.has(address)) {
      this.paymentHistory.set(address, []);
    }
    this.paymentHistory.get(address)!.unshift(payment);
    
    // Keep only last 100 payments
    const history = this.paymentHistory.get(address)!;
    if (history.length > 100) {
      history.splice(100);
    }
  }
}
