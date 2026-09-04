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
  'href',
  'mediaformat',
  'format',
  'id',
  'linkeditemid',
  'linkedarchiveid'
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-passcode'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { passcode, items, characters, item, bingoItems } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (expectedPassword && (!passcode || passcode.trim() !== expectedPassword.trim())) {
      return res.status(401).json({ error: 'Unauthorized: Invalid passcode' });
    }

    let currentDiskPayload = { items: [], characters: [], bingoItems: [] };
    const publicPath = path.join(process.cwd(), 'public', 'archive.json');
    const rootPath = path.join(process.cwd(), 'archive.json');
    const activePath = fs.existsSync(publicPath) ? publicPath : (fs.existsSync(rootPath) ? rootPath : null);

    if (activePath) {
      try {
        const raw = fs.readFileSync(activePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          currentDiskPayload.items = parsed;
        } else if (parsed && typeof parsed === 'object') {
          currentDiskPayload.items = Array.isArray(parsed.items) ? parsed.items : [];
          currentDiskPayload.characters = Array.isArray(parsed.characters) ? parsed.characters : [];
          currentDiskPayload.bingoItems = Array.isArray(parsed.bingoItems) ? parsed.bingoItems : [];
        }
      } catch (e) {
        console.warn('Error reading archive file:', e);
      }
    }

    let itemsArray = currentDiskPayload.items;
    let charactersArray = currentDiskPayload.characters;
    let bingoItemsArray = currentDiskPayload.bingoItems || [];

    if (Array.isArray(items)) {
      itemsArray = items;
    } else if (items && typeof items === 'object') {
      if (Array.isArray(items.items)) itemsArray = items.items;
      if (Array.isArray(items.characters)) charactersArray = items.characters;
      if (Array.isArray(items.bingoItems)) bingoItemsArray = items.bingoItems;
    }

    if (Array.isArray(characters)) {
      charactersArray = characters;
    }

    if (Array.isArray(bingoItems)) {
      bingoItemsArray = bingoItems;
    }

    if (item && item.title) {
      const newItem = {
        ...item,
        id: item.id || `item-${Date.now()}`,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const existingIdx = itemsArray.findIndex((i) => i.id === newItem.id);
      if (existingIdx >= 0) {
        itemsArray[existingIdx] = newItem;
      } else {
        itemsArray = [newItem, ...itemsArray];
      }
    }

    const fullArchivePayload = deepLowercase({
      items: itemsArray,
      characters: charactersArray,
      bingoItems: bingoItemsArray,
    });

    const updatedContent = JSON.stringify(fullArchivePayload, null, 2);

    // Save to local filesystem synchronously first so data is never lost
    try {
      const publicPath = path.join(process.cwd(), 'public', 'archive.json');
      const rootPath = path.join(process.cwd(), 'archive.json');
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(publicPath, updatedContent, 'utf-8');
      fs.writeFileSync(rootPath, updatedContent, 'utf-8');
    } catch (fsErr) {
      console.warn('Local filesystem write notice:', fsErr);
    }

    // GitHub integration setup
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !repo) {
      // Local disk update succeeded
      return res.status(200).json({
        success: true,
        message: `Saved database (${itemsArray.length} items, ${bingoItemsArray.length} bingo items) to local archive.json`,
        archive: fullArchivePayload,
      });
    }

    // Push to GitHub with retry and conflict handling
    let targetPath = 'public/archive.json';
    let fileSha = null;
    let githubError = null;

    try {
      // 1. Fetch current file info & SHA from GitHub
      let getRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/${targetPath}?ref=${branch}&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Medium-Archive-App',
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (getRes.status === 404) {
        const altPath = 'archive.json';
        const altRes = await fetch(
          `https://api.github.com/repos/${repo}/contents/${altPath}?ref=${branch}&t=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'Medium-Archive-App',
              'Cache-Control': 'no-cache',
            },
          }
        );
        if (altRes.ok) {
          targetPath = altPath;
          const altData = await altRes.json();
          fileSha = altData.sha;
        }
      } else if (getRes.ok) {
        const fileData = await getRes.json();
        fileSha = fileData.sha;
      }

      // 2. Encode archive content as base64
      const encodedContent = Buffer.from(updatedContent, 'utf-8').toString('base64');

      const putPayload = {
        message: `Update archive database [${itemsArray.length} items, ${bingoItemsArray.length} bingo items]`,
        content: encodedContent,
        branch: branch,
      };
      if (fileSha) {
        putPayload.sha = fileSha;
      }

      // 3. Commit updated archive to GitHub
      let putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${targetPath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Medium-Archive-App',
        },
        body: JSON.stringify(putPayload),
      });

      // Handle 409 conflict by refetching SHA once
      if (putRes.status === 409) {
        const refetchRes = await fetch(
          `https://api.github.com/repos/${repo}/contents/${targetPath}?ref=${branch}&t=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'Medium-Archive-App',
              'Cache-Control': 'no-cache',
            },
          }
        );
        if (refetchRes.ok) {
          const freshData = await refetchRes.json();
          putPayload.sha = freshData.sha;
          putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${targetPath}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Medium-Archive-App',
            },
            body: JSON.stringify(putPayload),
          });
        }
      }

      if (!putRes.ok) {
        const errText = await putRes.text();
        githubError = `GitHub PUT failed (${putRes.status}): ${errText}`;
        console.warn(githubError);
      }
    } catch (ghEx) {
      githubError = ghEx.message || String(ghEx);
      console.warn('GitHub commit network notice:', githubError);
    }

    return res.status(200).json({
      success: true,
      message: githubError
        ? `Saved to local archive.json (${itemsArray.length} items). GitHub sync notice: ${githubError}`
        : `Successfully committed ${itemsArray.length} items to GitHub repo (${targetPath})`,
      archive: fullArchivePayload,
      githubSynced: !githubError,
    });
  } catch (error) {
    console.error('Error in /api/save-archive:', error);
    return res.status(500).json({
      error: error.message || 'An unknown error occurred while saving the archive',
      details: error.stack || String(error),
    });
  }
}
