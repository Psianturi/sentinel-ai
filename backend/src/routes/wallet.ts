import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService';

const router = Router();
const walletService = new WalletService();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const wallet = await walletService.createWallet(userId, email);
    res.json(wallet);
  } catch (error) {
    console.error('Wallet creation error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

/**
 * GET /api/wallet/balance/:address
 * Get wallet balances (sGOLD, sBOND, native)
 */
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const balances = await walletService.getBalances(address);
    res.json(balances);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

/**
 * GET /api/wallet/portfolio/:address
 * Get full portfolio details from SentinelVault
 */
router.get('/portfolio/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const portfolio = await walletService.getPortfolio(address);
    res.json(portfolio);
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});


router.post('/claim-faucet', async (req: Request, res: Response) => {
  try {
    const { address, token } = req.body;
    
    if (!address || !token) {
      return res.status(400).json({ error: 'Address and token type are required' });
    }

    const result = await walletService.claimFaucet(address, token);
    res.json(result);
  } catch (error) {
    console.error('Faucet claim error:', error);
    res.status(500).json({ error: 'Failed to claim faucet' });
  }
});


router.post('/deposit', async (req: Request, res: Response) => {
  try {
    const { address, token, amount } = req.body;
    
    if (!address || !token || !amount) {
      return res.status(400).json({ error: 'Address, token, and amount are required' });
    }

    const result = await walletService.depositToVault(address, token, amount);
    res.json(result);
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to deposit' });
  }
});

/**
 * POST /api/wallet/withdraw
 * Withdraw tokens from SentinelVault
 */
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { address, token, amount } = req.body;
    
    if (!address || !token || !amount) {
      return res.status(400).json({ error: 'Address, token, and amount are required' });
    }

    const result = await walletService.withdrawFromVault(address, token, amount);
    res.json(result);
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

/**
 * POST /api/wallet/claim-yield
 * Claim accumulated yield
 */
router.post('/claim-yield', async (req: Request, res: Response) => {
  try {
    const { address, token } = req.body;
    
    if (!address || !token) {
      return res.status(400).json({ error: 'Address and token are required' });
    }

    const result = await walletService.claimYield(address, token);
    res.json(result);
  } catch (error) {
    console.error('Yield claim error:', error);
    res.status(500).json({ error: 'Failed to claim yield' });
  }
});

/**
 * POST /api/wallet/settings
 * Update wallet settings (invisible mode, auto-compound, spending limit)
 */
router.post('/settings', async (req: Request, res: Response) => {
  try {
    const { address, invisibleMode, autoCompound, spendingAllowance } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await walletService.updateSettings(address, {
      invisibleMode,
      autoCompound,
      spendingAllowance
    });
    res.json(result);
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as walletRouter };
