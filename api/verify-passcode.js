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

  const { passcode } = req.body || {};
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (expectedPassword && (!passcode || passcode.trim() !== expectedPassword.trim())) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid passcode' });
  }

  return res.status(200).json({ success: true, message: 'Passcode verified successfully' });
}
