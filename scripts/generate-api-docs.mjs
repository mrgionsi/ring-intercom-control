import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const routeFiles = [
  'backend/src/app.ts',
  'backend/src/routes/auth.ts',
  'backend/src/routes/ring.ts',
  'backend/src/routes/guest.ts',
  'backend/src/routes/admin.ts',
  'backend/src/routes/audit.ts'
];

const mountPrefixByFile = {
  'backend/src/routes/auth.ts': '/api/auth',
  'backend/src/routes/ring.ts': '/api/ring',
  'backend/src/routes/admin.ts': '/api/admin',
  'backend/src/routes/audit.ts': '/api',
  'backend/src/routes/guest.ts': '/api',
  'backend/src/app.ts': ''
};

const routeRegex =
  /\/\*\*([\s\S]*?)\*\/\s*(?:router|app)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;

function parseCommentBlock(block) {
  const lines = block
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  const description = [];
  const tags = new Map();

  for (const line of lines) {
    const tagMatch = /^@([a-zA-Z_]+)\s*(.*)$/.exec(line);
    if (!tagMatch) {
      description.push(line);
      continue;
    }
    const [, key, value] = tagMatch;
    const entries = tags.get(key) ?? [];
    entries.push(value.trim());
    tags.set(key, entries);
  }

  return { description: description.join(' '), tags };
}

function normalizePath(prefix, routePath) {
  if (routePath.startsWith('/api/')) {
    return routePath;
  }
  if (!prefix) {
    return routePath;
  }
  if (prefix.endsWith('/') && routePath.startsWith('/')) {
    return `${prefix.slice(0, -1)}${routePath}`;
  }
  return `${prefix}${routePath}`;
}

function inferExampleValue(fieldName) {
  const normalized = fieldName.toLowerCase();
  if (normalized.endsWith('id') || normalized.includes('userid')) return 1;
  if (normalized.includes('email')) return 'user@example.com';
  if (normalized.includes('password')) return 'Password123!';
  if (normalized.includes('token')) return 'token-value';
  if (normalized.includes('code')) return '123456';
  if (normalized.includes('label') || normalized.includes('name')) return 'Example';
  if (normalized.includes('intercom')) return '705848315';
  if (normalized.includes('startsat') || normalized.includes('expiresat')) {
    return '2026-02-24T12:00:00.000Z';
  }
  if (normalized.includes('maxuses') || normalized.includes('duration') || normalized.includes('page')) return 1;
  if (normalized.includes('perminute')) return 60;
  if (normalized.startsWith('is') || normalized.includes('enabled') || normalized.includes('disabled')) return true;
  return 'string';
}

function buildBodyExample(bodyTag) {
  if (!bodyTag) return null;
  const fields = bodyTag
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  if (!fields.length) return null;

  const out = {};
  for (const token of fields) {
    const key = token.replace(/\?$/, '');
    out[key] = inferExampleValue(key);
  }
  return JSON.stringify(out, null, 2);
}

const endpoints = [];

for (const relativeFile of routeFiles) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  const source = readFileSync(absoluteFile, 'utf8');
  const prefix = mountPrefixByFile[relativeFile] ?? '';

  let match;
  while ((match = routeRegex.exec(source)) !== null) {
    const [, commentBlock, detectedMethod, detectedPath] = match;
    const parsed = parseCommentBlock(commentBlock);
    const apiTag = (parsed.tags.get('api') ?? [])[0];

    let method = detectedMethod.toUpperCase();
    let endpointPath = normalizePath(prefix, detectedPath);
    if (apiTag) {
      const apiParts = apiTag.split(/\s+/).filter(Boolean);
      if (apiParts.length >= 2) {
        method = apiParts[0].toUpperCase();
        endpointPath = apiParts.slice(1).join(' ');
      }
    }

    endpoints.push({
      method,
      path: endpointPath,
      description: parsed.description,
      access: (parsed.tags.get('access') ?? [])[0] ?? 'Authenticated',
      query: (parsed.tags.get('query') ?? [])[0] ?? null,
      body: (parsed.tags.get('body') ?? [])[0] ?? null,
      bodyExample: buildBodyExample((parsed.tags.get('body') ?? [])[0] ?? null),
      success: (parsed.tags.get('success') ?? [])[0] ?? null,
      errors: parsed.tags.get('error') ?? [],
      source: relativeFile
    });
  }
}

endpoints.sort((a, b) => {
  if (a.path === b.path) {
    return a.method.localeCompare(b.method);
  }
  return a.path.localeCompare(b.path);
});

const lines = [];
lines.push('---');
lines.push('title: API Reference (Generated)');
lines.push('sidebar_position: 2');
lines.push('---');
lines.push('');
lines.push('{/* Auto-generated from backend route docstrings. Do not edit manually. */}');
lines.push('');
lines.push('This page is generated from JSDoc `@api` blocks in backend source files.');
lines.push('');

for (const endpoint of endpoints) {
  lines.push(`## \`${endpoint.method} ${endpoint.path}\``);
  lines.push('');
  if (endpoint.description) {
    lines.push(endpoint.description);
    lines.push('');
  }
  lines.push(`- Access: \`${endpoint.access}\``);
  if (endpoint.query) {
    lines.push(`- Query: \`${endpoint.query}\``);
  }
  if (endpoint.body) {
    lines.push(`- Body: \`${endpoint.body}\``);
  }
  if (endpoint.bodyExample) {
    lines.push('');
    lines.push('Body example:');
    lines.push('');
    lines.push('```json');
    lines.push(endpoint.bodyExample);
    lines.push('```');
  }
  if (endpoint.success) {
    lines.push(`- Success: \`${endpoint.success}\``);
  }
  if (endpoint.errors.length) {
    lines.push('- Errors:');
    for (const errorLine of endpoint.errors) {
      lines.push(`  - \`${errorLine}\``);
    }
  }
  lines.push(`- Source: \`${endpoint.source}\``);
  lines.push('');
}

const outputPath = path.join(repoRoot, 'website', 'docs', 'api', 'reference.md');
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Generated ${outputPath} with ${endpoints.length} endpoints.`);
