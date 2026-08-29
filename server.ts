import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import addItemHandler from './api/add-item.js';
import verifyPasscodeHandler from './api/verify-passcode.js';
import saveArchiveHandler from './api/save-archive.js';
import getArchiveHandler from './api/get-archive.js';
import aiSortHandler from './api/ai-sort.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Add X-Robots-Tag header to all responses
  app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    next();
  });

  // Mount /api/get-archive route
  app.all('/api/get-archive', async (req, res) => {
    try {
      await getArchiveHandler(req, res);
    } catch (err: any) {
      console.error('Get Archive API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount /api/add-item route
  app.all('/api/add-item', async (req, res) => {
    try {
      await addItemHandler(req, res);
    } catch (err: any) {
      console.error('API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount /api/save-archive route
  app.all('/api/save-archive', async (req, res) => {
    try {
      await saveArchiveHandler(req, res);
    } catch (err: any) {
      console.error('Save Archive API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount /api/verify-passcode route
  app.all('/api/verify-passcode', async (req, res) => {
    try {
      await verifyPasscodeHandler(req, res);
    } catch (err: any) {
      console.error('Verify Passcode API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount /api/ai-sort route
  app.all('/api/ai-sort', async (req, res) => {
    try {
      await aiSortHandler(req, res);
    } catch (err: any) {
      console.error('AI Sort API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Serve archive.json directly with anti-caching headers
  app.get('/archive.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const publicArchivePath = path.join(process.cwd(), 'public', 'archive.json');
    if (fs.existsSync(publicArchivePath)) {
      res.sendFile(publicArchivePath);
    } else {
      res.sendFile(path.join(process.cwd(), 'archive.json'));
    }
  });

  // Serve dynamic sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const defaultDomain = 'https://medium-archive-qt5zas9pg-fourward1.vercel.app';
    const host = req.get('host') ? `${req.protocol}://${req.get('host')}` : defaultDomain;
    let archiveItems: any = [];
    const publicArchivePath = path.join(process.cwd(), 'public', 'archive.json');
    const rootArchivePath = path.join(process.cwd(), 'archive.json');
    const activePath = fs.existsSync(publicArchivePath) ? publicArchivePath : (fs.existsSync(rootArchivePath) ? rootArchivePath : null);

    if (activePath) {
      try {
        const raw = fs.readFileSync(activePath, 'utf-8');
        archiveItems = JSON.parse(raw);
      } catch (e) {
        console.warn('Error reading archive for sitemap:', e);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/archive', priority: '0.9', changefreq: 'daily' },
      { loc: '/hornets', priority: '0.8', changefreq: 'weekly' },
      { loc: '/rating-scale', priority: '0.7', changefreq: 'monthly' },
      { loc: '/about-hornet', priority: '0.6', changefreq: 'monthly' },
      { loc: '/donate', priority: '0.5', changefreq: 'monthly' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    staticPages.forEach((p) => {
      xml += `  <url>\n    <loc>${host}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
    });

    let itemsList: any[] = [];
    if (Array.isArray(archiveItems)) {
      itemsList = archiveItems;
    } else if (archiveItems && typeof archiveItems === 'object' && Array.isArray(archiveItems.items)) {
      itemsList = archiveItems.items;
    }

    if (itemsList.length > 0) {
      itemsList.forEach((item) => {
        if (item.id) {
          const itemDate = item.updatedAt ? item.updatedAt.split('T')[0] : today;
          xml += `  <url>\n    <loc>${host}/?item=${encodeURIComponent(item.id)}</loc>\n    <lastmod>${itemDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
        }
      });
    }

    xml += `</urlset>`;
    res.send(xml);
  });

  // Vite middleware for development or static serving for production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
