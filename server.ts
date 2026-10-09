import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// Health check endpoint for Cloud Run
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// Determine static root directory
const distDir = path.join(__dirname, 'dist');
const hasDist = fs.existsSync(distDir);
const staticRoot = hasDist ? distDir : __dirname;

app.use(express.static(staticRoot));

// Fallback to index.html for SPA client-side routing
app.get('*', (_req, res) => {
  const indexPath = path.join(staticRoot, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port} (serving from ${staticRoot})`);
});
