import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.js';
import classesRoutes from './routes/classes.js';
import aiRoutes from './routes/ai.js';
import { runMigrations } from './db/migrate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Serve the built frontend on Render/production.
const frontendDistPath = path.resolve(process.cwd(), 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// SPA fallback (must be after API routes).
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Backend server running: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });

export default app;
