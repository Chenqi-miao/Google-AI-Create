import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), 'attendance_data.json');

  app.use(cors());
  app.use(express.json());

  // Helper to read data
  const readData = () => {
    if (!fs.existsSync(DATA_FILE)) return {};
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
      return {};
    }
  };

  // Helper to write data
  const writeData = (data: any) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  };

  // API Routes
  app.get('/api/attendance', (req, res) => {
    const data = readData();
    res.json(data);
  });

  app.post('/api/attendance', (req, res) => {
    const { records } = req.body;
    if (!records) return res.status(400).json({ error: 'Missing records' });
    writeData(records);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
