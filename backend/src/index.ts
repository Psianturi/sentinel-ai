import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { agentRouter } from './routes/agent';
import { walletRouter } from './routes/wallet';
import { paymentRouter } from './routes/payment';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 
           'http://127.0.0.1:8080', 'http://localhost:49152', 'http://127.0.0.1:49152',
           'http://10.0.2.2:3000', // Android emulator
           'http://10.0.0.1:3000', // Local network
           /^http:\/\/localhost:\d+$/, // All localhost ports
           /^http:\/\/127\.0\.0\.1:\d+$/, // All 127.0.0.1 ports
           /^http:\/\/10\.0\.\d+\.\d+:\d+$/ // All local network addresses
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'Sentinel AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/agent', agentRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/payment', paymentRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🛡️  SENTINEL AI                        ║
║              AI-Powered Financial Guardian                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port ${port}                             ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
