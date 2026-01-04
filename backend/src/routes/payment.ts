import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';

const router = Router();
const paymentService = new PaymentService();

/**
 * POST /api/payment/execute
 * Execute a payment through x402 facilitator
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { 
      userAddress, 
      merchantAddress, 
      amount, 
      token, 
      memo 
    } = req.body;
    
    if (!userAddress || !merchantAddress || !amount) {
      return res.status(400).json({ 
        error: 'userAddress, merchantAddress, and amount are required' 
      });
    }

    const result = await paymentService.executePayment({
      userAddress,
      merchantAddress,
      amount,
      token: token || 'sGOLD',
      memo: memo || ''
    });
    
    res.json(result);
  } catch (error) {
    console.error('Payment execution error:', error);
    res.status(500).json({ error: 'Failed to execute payment' });
  }
});

/**
 * POST /api/payment/qr-pay
 * Process QR code payment (scan and pay)
 */
router.post('/qr-pay', async (req: Request, res: Response) => {
  try {
    const { userAddress, qrData } = req.body;
    
    if (!userAddress || !qrData) {
      return res.status(400).json({ error: 'userAddress and qrData are required' });
    }

    // Parse QR data (expected format: merchant:address:amount:memo)
    const paymentInfo = paymentService.parseQRCode(qrData);
    
    const result = await paymentService.executePayment({
      userAddress,
      merchantAddress: paymentInfo.merchantAddress,
      amount: paymentInfo.amount,
      token: paymentInfo.token || 'sGOLD',
      memo: paymentInfo.memo || 'QR Payment'
    });
    
    res.json(result);
  } catch (error) {
    console.error('QR payment error:', error);
    res.status(500).json({ error: 'Failed to process QR payment' });
  }
});

/**
 * POST /api/payment/subscribe
 * Setup recurring payment (subscription)
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { 
      userAddress, 
      merchantAddress, 
      amount, 
      token,
      interval, // 'daily', 'weekly', 'monthly'
      description 
    } = req.body;
    
    if (!userAddress || !merchantAddress || !amount || !interval) {
      return res.status(400).json({ 
        error: 'userAddress, merchantAddress, amount, and interval are required' 
      });
    }

    const subscription = await paymentService.createSubscription({
      userAddress,
      merchantAddress,
      amount,
      token: token || 'sGOLD',
      interval,
      description: description || 'Subscription'
    });
    
    res.json(subscription);
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * GET /api/payment/history/:address
 * Get payment history for user
 */
router.get('/history/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit, offset } = req.query;
    
    const history = await paymentService.getPaymentHistory(
      address,
      Number(limit) || 20,
      Number(offset) || 0
    );
    
    res.json(history);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * POST /api/payment/estimate
 * Estimate payment (convert RWA to stablecoin value)
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { amount, fromToken, toToken } = req.body;
    
    if (!amount || !fromToken) {
      return res.status(400).json({ error: 'amount and fromToken are required' });
    }

    const estimate = await paymentService.estimatePayment(
      amount,
      fromToken,
      toToken || 'USDC'
    );
    
    res.json(estimate);
  } catch (error) {
    console.error('Payment estimation error:', error);
    res.status(500).json({ error: 'Failed to estimate payment' });
  }
});

/**
 * POST /api/payment/generate-qr
 * Generate QR code for merchant to receive payment
 */
router.post('/generate-qr', async (req: Request, res: Response) => {
  try {
    const { merchantAddress, amount, token, memo } = req.body;
    
    if (!merchantAddress) {
      return res.status(400).json({ error: 'merchantAddress is required' });
    }

    const qrData = paymentService.generateQRCode({
      merchantAddress,
      amount,
      token: token || 'sGOLD',
      memo: memo || ''
    });
    
    res.json({ qrData });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export { router as paymentRouter };
