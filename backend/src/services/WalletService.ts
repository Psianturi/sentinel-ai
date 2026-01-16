import { ethers } from 'ethers';

interface WalletInfo {
  address: string;
  userId: string;
  createdAt: string;
}

interface TokenBalances {
  sGold: string;
  sBond: string;
  native: string;
  usdValue: number;
}

interface Portfolio {
  sGoldBalance: string;
  sBondBalance: string;
  spendingAllowance: string;
  totalDeposited: string;
  totalYieldEarned: string;
  autoCompound: boolean;
  invisibleMode: boolean;
}

interface WalletSettings {
  invisibleMode?: boolean;
  autoCompound?: boolean;
  spendingAllowance?: string;
}

// Contract ABIs (simplified for demo)
const SGOLD_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function claimFaucet() external',
  'function mint(address to, uint256 amount) external',
  'function pendingYield(address) view returns (uint256)',
  'function claimYield() external',
  'function faucetCooldownRemaining(address) view returns (uint256)'
];

const SBOND_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function claimFaucet() external',
  'function mint(address to, uint256 amount) external',
  'function pendingYield(address) view returns (uint256)',
  'function claimYield() external',
  'function faucetCooldownRemaining(address) view returns (uint256)'
];

const VAULT_ABI = [
  'function getPortfolio(address) view returns (tuple(uint256 sGoldBalance,uint256 sBondBalance,uint256 spendingAllowance,uint256 totalDeposited,uint256 totalYieldEarned,bool autoCompound,bool invisibleMode))',
  'function depositGold(uint256) external',
  'function depositBond(uint256) external',
  'function withdrawGold(uint256) external',
  'function withdrawBond(uint256) external',
  'function setSpendingAllowance(uint256) external',
  'function toggleInvisibleMode() external',
  'function toggleAutoCompound() external'
];

/**
 * WalletService - Manages user wallets and blockchain interactions
 * Supports embedded wallets and Account Abstraction
 */
export class WalletService {
  private provider: ethers.JsonRpcProvider;
  private agentWallet: ethers.Wallet | null = null;
  private userWallets: Map<string, ethers.HDNodeWallet>;

  constructor() {
    const rpcUrl = process.env.CRONOS_ZKEVM_TESTNET_RPC || 'https://testnet.zkevm.cronos.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.userWallets = new Map();

    // Initialize agent wallet if private key is provided
    if (process.env.AGENT_PRIVATE_KEY) {
      this.agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, this.provider);
    }
  }

  /**
   * Create an embedded wallet for user
   * In production, this would use Account Abstraction
   */
  async createWallet(userId: string, email?: string): Promise<WalletInfo> {
    // Check if wallet already exists
    if (this.userWallets.has(userId)) {
      const existing = this.userWallets.get(userId)!;
      return {
        address: existing.address,
        userId,
        createdAt: new Date().toISOString()
      };
    }

    // Create new wallet
    const wallet = ethers.Wallet.createRandom().connect(this.provider);
    this.userWallets.set(userId, wallet);

    // TODO: In production, store encrypted in database
    // TODO: Implement Account Abstraction for gasless transactions

    return {
      address: wallet.address,
      userId,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get wallet balances
   */
  async getBalances(address: string): Promise<TokenBalances> {
    const sGoldAddress = process.env.SGOLD_CONTRACT_ADDRESS;
    const sBondAddress = process.env.SBOND_CONTRACT_ADDRESS;

    let sGoldBalance = '0';
    let sBondBalance = '0';

    try {
      // Validate address format (very basic check)
      if (!address.startsWith('0x') || address.length !== 42) {
        console.error('Invalid address format:', address);
        return {
          sGold: '0',
          sBond: '0',
          native: '0',
          usdValue: 0
        };
      }

      // Get native balance
      const nativeBalance = await this.provider.getBalance(address);

      // Get token balances if contracts are deployed
      if (sGoldAddress) {
        const sGoldContract = new ethers.Contract(sGoldAddress, SGOLD_ABI, this.provider);
        const balance = await sGoldContract.balanceOf(address);
        sGoldBalance = ethers.formatEther(balance);
      }

      if (sBondAddress) {
        const sBondContract = new ethers.Contract(sBondAddress, SBOND_ABI, this.provider);
        const balance = await sBondContract.balanceOf(address);
        sBondBalance = ethers.formatEther(balance);
      }

      // Calculate USD value (sGOLD = $2000, sBOND = $100)
      const sGoldValue = parseFloat(sGoldBalance) * 2000;
      const sBondValue = parseFloat(sBondBalance) * 100;

      return {
        sGold: sGoldBalance,
        sBond: sBondBalance,
        native: ethers.formatEther(nativeBalance),
        usdValue: sGoldValue + sBondValue
      };
    } catch (error) {
      console.error('Error fetching balances:', error);
      // If RPC is unavailable or contracts are misconfigured, return safe zeros.
      return {
        sGold: '0',
        sBond: '0',
        native: '0',
        usdValue: 0
      };
    }
  }

  /**
   * Get portfolio from SentinelVault
   */
  async getPortfolio(address: string): Promise<Portfolio> {
    const vaultAddress = process.env.SENTINEL_VAULT_ADDRESS;

    try {
      if (vaultAddress) {
        const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, this.provider);
        const portfolio = await vaultContract.getPortfolio(address);

        return {
          sGoldBalance: ethers.formatEther(portfolio[0]),
          sBondBalance: ethers.formatEther(portfolio[1]),
          spendingAllowance: ethers.formatEther(portfolio[2]),
          totalDeposited: ethers.formatEther(portfolio[3]),
          totalYieldEarned: ethers.formatEther(portfolio[4]),
          autoCompound: portfolio[5],
          invisibleMode: portfolio[6]
        };
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }

    // Return mock data for demo
    return {
      sGoldBalance: '50.0',
      sBondBalance: '1000.0',
      spendingAllowance: '100.0',
      totalDeposited: '150000.0',
      totalYieldEarned: '150.0',
      autoCompound: true,
      invisibleMode: false
    };
  }

  /**
   * Claim tokens from faucet
   */
  async claimFaucet(address: string, token: string): Promise<{ success: boolean; txHash?: string; message: string }> {
    const normalizedToken = (token || '').trim();
    const tokenAddress = normalizedToken === 'sGOLD'
      ? process.env.SGOLD_CONTRACT_ADDRESS
      : normalizedToken === 'sBOND'
        ? process.env.SBOND_CONTRACT_ADDRESS
        : undefined;

    try {
      if (!tokenAddress) {
        return {
          success: false,
          message: 'Token not supported or missing contract address. Use token: sGOLD or sBOND.'
        };
      }

      if (!this.agentWallet) {
        return {
          success: false,
          message: 'AGENT_PRIVATE_KEY is not configured on backend.'
        };
      }

      {
        const contract = new ethers.Contract(
          tokenAddress, 
          normalizedToken === 'sGOLD' ? SGOLD_ABI : SBOND_ABI,
          this.agentWallet
        );

        // Backend mints directly to the user address (owner-only).
        // Assumption: AGENT_PRIVATE_KEY is the deployer/owner of the token contract.
        const amount = normalizedToken === 'sGOLD'
          ? ethers.parseEther('100')
          : ethers.parseEther('1000');

        const tx = await contract.mint(address, amount);
        await tx.wait(1);

        return {
          success: true,
          txHash: tx.hash,
          message: `Minted ${normalizedToken === 'sGOLD' ? '100 sGOLD' : '1000 sBOND'} to ${address}`
        };
      }
    } catch (error) {
      console.error('Faucet claim error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to mint faucet tokens: ${message}`
      };
    }
  }

  /**
   * Deposit tokens to vault
   */
  async depositToVault(
    address: string, 
    token: string, 
    amount: string
  ): Promise<{ success: boolean; txHash?: string; message: string }> {
    // TODO: Implement actual deposit with Account Abstraction
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      message: `Deposited ${amount} ${token} to Sentinel Vault (Demo Mode)`
    };
  }

  /**
   * Withdraw tokens from vault
   */
  async withdrawFromVault(
    address: string, 
    token: string, 
    amount: string
  ): Promise<{ success: boolean; txHash?: string; message: string }> {
    // TODO: Implement actual withdrawal
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      message: `Withdrew ${amount} ${token} from Sentinel Vault (Demo Mode)`
    };
  }

  /**
   * Claim yield from tokens
   */
  async claimYield(
    address: string, 
    token: string
  ): Promise<{ success: boolean; txHash?: string; amount: string; message: string }> {
    // TODO: Implement actual yield claim
    const yieldAmount = token === 'sGOLD' ? '2.5' : '10.0';
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      amount: yieldAmount,
      message: `Claimed ${yieldAmount} ${token} yield (Demo Mode)`
    };
  }

  /**
   * Update wallet settings
   */
  async updateSettings(
    address: string, 
    settings: WalletSettings
  ): Promise<{ success: boolean; message: string }> {
    // TODO: Implement actual settings update via vault contract
    const updates: string[] = [];
    
    if (settings.invisibleMode !== undefined) {
      updates.push(`Invisible Mode: ${settings.invisibleMode ? 'ON' : 'OFF'}`);
    }
    if (settings.autoCompound !== undefined) {
      updates.push(`Auto-Compound: ${settings.autoCompound ? 'ON' : 'OFF'}`);
    }
    if (settings.spendingAllowance !== undefined) {
      updates.push(`Spending Allowance: $${settings.spendingAllowance}`);
    }

    return {
      success: true,
      message: `Settings updated: ${updates.join(', ')}`
    };
  }
}
