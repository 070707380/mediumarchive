import fs from 'fs';
import path from 'path';

const URL_KEYS = new Set([
  'cover',
  'coverurl',
  'photourl',
  'customcover',
  'thumbnailurl',
  'imageurl',
  'avatar',
  'avatarurl',
  'image',
  'url',
  'link',
  'wikiurl',
  'src',
  'href'
]);

function isUrlOrImageString(str) {
  if (!str) return false;
  const s = str.trim();
  if (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:') ||
    s.startsWith('blob:') ||
    s.startsWith('//') ||
    s.includes('://')
  ) {
    return true;
  }
  return false;
}

function deepLowercase(val) {
  if (typeof val === 'string') {
    if (isUrlOrImageString(val)) {
      return val;
    }
    return val.toLowerCase();
  }
  if (Array.isArray(val)) {
    return val.map(deepLowercase);
  }
  if (val !== null && typeof val === 'object') {
    const res = {};
    for (const key of Object.keys(val)) {
      const propVal = val[key];
      if (typeof propVal === 'string') {
        if (URL_KEYS.has(key.toLowerCase()) || isUrlOrImageString(propVal)) {
          res[key] = propVal;
        } else {
          res[key] = propVal.toLowerCase();
        }
      } else {
        res[key] = deepLowercase(propVal);
      }
    }
    return res;
  }
  return val;
}

export default async function handler(req, res) {
  // CORS & Anti-caching headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    let archiveData = null;

    // 1. Try fetching directly from GitHub REST API if env vars exist
    if (token && repo) {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Medium-Archive-App',
        'Cache-Control': 'no-cache',
      };

      try {
        let getRes = await fetch(
          `https://api.github.com/repos/${repo}/contents/public/archive.json?ref=${branch}&t=${Date.now()}`,
          { headers }
        );

        if (getRes.status === 404) {
          getRes = await fetch(
            `https://api.github.com/repos/${repo}/contents/archive.json?ref=${branch}&t=${Date.now()}`,
            { headers }
          );
        }

        if (getRes.ok) {
          const fileJson = await getRes.json();
          if (fileJson.content) {
            const contentStr = Buffer.from(fileJson.content, 'base64').toString('utf-8');
            archiveData = JSON.parse(contentStr);
          }
        }
      } catch (ghErr) {
        console.warn('GitHub API fetch notice in get-archive:', ghErr);
      }
    }

    // 2. Fallback: try raw GitHub URL if repo is set
    if (!archiveData && repo) {
      const rawUrls = [
        `https://raw.githubusercontent.com/${repo}/${branch}/public/archive.json?t=${Date.now()}`,
        `https://raw.githubusercontent.com/${repo}/${branch}/archive.json?t=${Date.now()}`,
      ];

      for (const url of rawUrls) {
        try {
          const rawRes = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
          if (rawRes.ok) {
            const data = await rawRes.json();
            if (data && (Array.isArray(data) || Array.isArray(data.items))) {
              archiveData = data;
              break;
            }
          }
        } catch (e) {
          console.warn(`Failed fetching raw URL ${url}:`, e);
        }
      }
    }

    // 3. Fallback: try local filesystem if available
    if (!archiveData) {
      const publicPath = path.join(process.cwd(), 'public', 'archive.json');
      const rootPath = path.join(process.cwd(), 'archive.json');
      if (fs.existsSync(publicPath)) {
        try {
          archiveData = JSON.parse(fs.readFileSync(publicPath, 'utf-8'));
        } catch (e) {
          console.warn('Failed parsing public/archive.json:', e);
        }
      } else if (fs.existsSync(rootPath)) {
        try {
          archiveData = JSON.parse(fs.readFileSync(rootPath, 'utf-8'));
        } catch (e) {
          console.warn('Failed parsing root archive.json:', e);
        }
      }
    }

    if (archiveData) {
      return res.status(200).json(deepLowercase(archiveData));
    }

    return res.status(200).json({ items: [] });
  } catch (error) {
    console.error('Error in /api/get-archive:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch live archive from GitHub',
      details: error.stack || String(error),
    });
  }
}
