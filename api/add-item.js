import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // CORS headers for Vercel Serverless Function
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
    const { passcode, item } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (expectedPassword && (!passcode || passcode.trim() !== expectedPassword.trim())) {
      return res.status(401).json({ error: 'Unauthorized: Invalid passcode' });
    }

    if (!item || !item.title) {
      return res.status(400).json({ error: 'Bad Request: Missing item data' });
    }

    const newItem = {
      ...item,
      id: item.id || `item-${Date.now()}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !repo) {
      return res.status(500).json({
        error: 'Server misconfiguration: GITHUB_TOKEN and GITHUB_REPO environment variables are not set on Vercel.',
        details: 'Ensure GITHUB_TOKEN and GITHUB_REPO are configured in Vercel project environment settings.',
      });
    }

    let targetPath = 'public/archive.json';
    let fileSha = null;
    let currentData = [];

    // 1. Fetch current file info & content from GitHub
    let getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${targetPath}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Medium-Archive-App',
        },
      }
    );

    if (getRes.status === 404) {
      const altPath = 'archive.json';
      const altRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/${altPath}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Medium-Archive-App',
          },
        }
      );
      if (altRes.ok) {
        targetPath = altPath;
        const fileJson = await altRes.json();
        fileSha = fileJson.sha;
        const contentStr = Buffer.from(fileJson.content, 'base64').toString('utf-8');
        currentData = JSON.parse(contentStr);
      }
    } else if (getRes.ok) {
      const fileJson = await getRes.json();
      fileSha = fileJson.sha;
      const contentStr = Buffer.from(fileJson.content, 'base64').toString('utf-8');
      currentData = JSON.parse(contentStr);
    } else {
      const errText = await getRes.text();
      throw new Error(`GitHub GET ${targetPath} failed (${getRes.status}): ${errText}`);
    }

    let itemsArray = [];
    let charactersArray = [];

    if (Array.isArray(currentData)) {
      itemsArray = currentData;
    } else if (currentData && typeof currentData === 'object') {
      if (Array.isArray(currentData.items)) itemsArray = currentData.items;
      if (Array.isArray(currentData.characters)) charactersArray = currentData.characters;
    }

    const existingIdx = itemsArray.findIndex((i) => i.id === newItem.id);
    if (existingIdx >= 0) {
      itemsArray[existingIdx] = newItem;
    } else {
      itemsArray.unshift(newItem);
    }

    const fullArchivePayload = {
      items: itemsArray,
      characters: charactersArray,
    };

    const updatedContent = JSON.stringify(fullArchivePayload, null, 2);

    // Save to local filesystem if available
    try {
      const publicPath = path.join(process.cwd(), 'public', 'archive.json');
      const rootPath = path.join(process.cwd(), 'archive.json');
      fs.writeFileSync(publicPath, updatedContent, 'utf-8');
      if (fs.existsSync(rootPath)) {
        fs.writeFileSync(rootPath, updatedContent, 'utf-8');
      }
    } catch (fsErr) {
      console.warn('Local filesystem write notice in add-item:', fsErr);
    }
    const encodedContent = Buffer.from(updatedContent, 'utf-8').toString('base64');

    const putPayload = {
      message: `Add item: ${newItem.title} [Archive Admin]`,
      content: encodedContent,
      branch: branch,
    };
    if (fileSha) {
      putPayload.sha = fileSha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${targetPath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Medium-Archive-App',
      },
      body: JSON.stringify(putPayload),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`GitHub PUT ${targetPath} failed (${putRes.status}): ${errText}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully updated archive.json on GitHub repository',
      item: newItem,
      archive: currentData,
    });
  } catch (error) {
    console.error('GitHub API error in /api/add-item:', error);
    return res.status(500).json({
      error: error.message || 'Failed to save item to GitHub repository',
      details: error.stack || String(error),
    });
  }
}
