require('dotenv').config();

const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
const open5eBaseUrl = 'https://api.open5e.com';
const contentCache = new Map();
const contentCacheTtlMs = 6 * 60 * 60 * 1000;

if (!process.env.DATABASE_URL || !jwtSecret || jwtSecret.length < 32) {
  throw new Error('Set DATABASE_URL and a JWT_SECRET of at least 32 characters before starting the API.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const contentResources = {
  races: '/v1/races/',
  classes: '/v1/classes/',
  backgrounds: '/v2/backgrounds/',
  spells: '/v2/spells/',
  spelllists: '/v1/spelllist/',
  monsters: '/v1/monsters/',
  weapons: '/v2/weapons/',
  armor: '/v2/armor/',
  planes: '/v1/planes/',
  feats: '/v2/feats/',
  conditions: '/v2/conditions/',
  magicitems: '/v1/magicitems/'
};
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function publicUser(user) {
  return { id: user.id, email: user.email };
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '1h' });
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(match[1], jwtSecret);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

function validateCharacter(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const { name, race, class: characterClass, background } = input;
  if ([name, race, characterClass, background].some(value =>
    typeof value !== 'string' || value.trim().length === 0 || value.length > 100
  )) {
    return null;
  }
  const alignment = typeof input.alignment === 'string' && input.alignment.length <= 40
    ? input.alignment
    : 'Neutral';
  const integerInRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  if (!integerInRange(input.level ?? 1, 1, 20) ||
      !integerInRange(input.experiencePoints ?? 0, 0, 10000000) ||
      !['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
        .every(key => integerInRange(input[key] ?? 10, 3, 18))) {
    return null;
  }
  return {
    name: name.trim(),
    race: race.trim(),
    class: characterClass.trim(),
    background: background.trim(),
    alignment,
    level: input.level ?? 1,
    experiencePoints: input.experiencePoints ?? 0,
    strength: input.strength ?? 10,
    dexterity: input.dexterity ?? 10,
    constitution: input.constitution ?? 10,
    intelligence: input.intelligence ?? 10,
    wisdom: input.wisdom ?? 10,
    charisma: input.charisma ?? 10,
    data: Object.fromEntries(Object.entries(input).filter(([key]) =>
      !['id', 'userId', 'name', 'race', 'class', 'background', 'alignment', 'level',
        'experiencePoints', 'strength', 'dexterity', 'constitution', 'intelligence',
        'wisdom', 'charisma', 'createdAt', 'updatedAt'].includes(key)
    ))
  };
}

function presentCharacter(character) {
  const { data, ...fields } = character;
  return { ...fields, ...data };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/content/:resource', async (req, res) => {
  const path = contentResources[req.params.resource];
  if (!path) {
    return res.status(404).json({ error: 'Unknown content resource.' });
  }

  try {
    const cacheKey = req.params.resource;
    const cached = contentCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() && Object.keys(req.query).length === 0) {
      return res.json(cached.body);
    }
    if (cached && cached.expiresAt <= Date.now()) contentCache.delete(cacheKey);

    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') query.set(key, value);
    }

    let url = new URL(`${open5eBaseUrl}${path}`);
    for (const [key, value] of query) url.searchParams.set(key, value);
    const results = [];
    const visited = new Set();
    let count;

    while (url) {
      if (url.origin !== open5eBaseUrl || !url.pathname.startsWith(path) ||
          visited.has(url.href) || visited.size >= 100) {
        throw new Error('Open5e returned an invalid or excessive pagination link.');
      }
      visited.add(url.href);
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        console.error(`Open5e request failed: ${response.status} ${url.pathname}`);
        return res.status(502).json({ error: 'The D&D content service is temporarily unavailable.' });
      }
      const page = await response.json();
      if (!Array.isArray(page.results)) {
        throw new Error('Open5e returned an invalid response.');
      }
      results.push(...page.results);
      count = page.count ?? count;
      url = page.next ? new URL(page.next, url) : null;
    }

    const body = { count: results.length || count || 0, next: null, results };
    if (query.size === 0) {
      contentCache.set(cacheKey, { body, expiresAt: Date.now() + contentCacheTtlMs });
    }
    return res.json(body);
  } catch (error) {
    console.error('Content proxy failed:', error);
    return res.status(502).json({ error: 'Unable to load D&D content right now.' });
  }
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof password !== 'string' || password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Enter a valid email and a password of 12 to 72 UTF-8 bytes.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    return res.status(201).json({ token: createToken(user.id), user: publicUser(user) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('Account registration failed:', error);
    return res.status(500).json({ error: 'Unable to create the account.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    return res.json({ token: createToken(user.id), user: publicUser(user) });
  } catch (error) {
    console.error('Account login failed:', error);
    return res.status(500).json({ error: 'Unable to sign in.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    return res.json(publicUser(user));
  } catch (error) {
    console.error('Account lookup failed:', error);
    return res.status(500).json({ error: 'Unable to load the account.' });
  }
});

app.get('/api/characters', requireAuth, async (req, res) => {
  try {
    const characters = await prisma.character.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(characters.map(presentCharacter));
  } catch (error) {
    console.error('Character list failed:', error);
    return res.status(500).json({ error: 'Unable to load characters.' });
  }
});

app.post('/api/characters', requireAuth, async (req, res) => {
  const data = validateCharacter(req.body);
  if (!data) return res.status(400).json({ error: 'Character details are invalid.' });
  try {
    const character = await prisma.character.create({ data: { ...data, userId: req.userId } });
    return res.status(201).json(presentCharacter(character));
  } catch (error) {
    console.error('Character creation failed:', error);
    return res.status(500).json({ error: 'Unable to save this character.' });
  }
});

app.put('/api/characters/:id', requireAuth, async (req, res) => {
  const data = validateCharacter(req.body);
  if (!data) return res.status(400).json({ error: 'Character details are invalid.' });
  try {
    const result = await prisma.character.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data
    });
    if (result.count === 0) return res.status(404).json({ error: 'Character not found.' });
    const character = await prisma.character.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    return res.json(presentCharacter(character));
  } catch (error) {
    console.error('Character update failed:', error);
    return res.status(500).json({ error: 'Unable to update this character.' });
  }
});

app.delete('/api/characters/:id', requireAuth, async (req, res) => {
  try {
    const result = await prisma.character.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Character not found.' });
    return res.status(204).end();
  } catch (error) {
    console.error('Character deletion failed:', error);
    return res.status(500).json({ error: 'Unable to delete this character.' });
  }
});

const clientBuildPath = path.join(__dirname, '..', 'dist', 'mythic-tracker', 'browser');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(clientBuildPath, 'index.html'), error => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Unhandled API error:', error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const server = app.listen(port, () => console.log(`Mythic Tracker API listening on port ${port}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
