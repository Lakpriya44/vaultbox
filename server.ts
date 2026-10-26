import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './server/config';
import { db } from './server/db';
import { seedDemoDataIfEmpty } from './server/db/seed';

// API route imports
import authRoutes from './server/routes/authRoutes';
import fileRoutes from './server/routes/fileRoutes';
import folderRoutes from './server/routes/folderRoutes';
import shareRoutes from './server/routes/shareRoutes';
import auditRoutes from './server/routes/auditRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic security headers & CORS
  app.use(cors({
    origin: true,
    credentials: true,
    exposedHeaders: [
      'X-Vault-IV',
      'X-Vault-Wrapped-Key',
      'X-Vault-Wrapped-Key-IV',
      'X-Vault-Mime-Type',
      'X-Vault-Version',
      'X-Vault-Original-Name',
      'X-Vault-Is-Shared',
      'Content-Disposition',
    ],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Connect Database & Run Initial Seed
  await db.connect();
  await seedDemoDataIfEmpty();

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VaultBox Secure File Vault',
      zeroKnowledge: true,
      encryption: 'AES-GCM-256 / PBKDF2 / RSA-OAEP',
      dbMode: db.isMongo ? 'MongoDB' : 'LocalPersistentStore',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/shares', shareRoutes);
  app.use('/api/audit', auditRoutes);

  // Global 404 for unhandled API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Unhandled Server Error]:', err);
    res.status(err.status || 500).json({
      error: err.message || 'An unexpected internal server error occurred.',
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite Dev Server in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`🔐 VaultBox server listening on http://0.0.0.0:${config.port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start VaultBox server:', err);
  process.exit(1);
});
