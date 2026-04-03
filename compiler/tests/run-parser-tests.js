#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = __dirname;
const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures');
const OUTPUT_DIR = path.join(TESTS_DIR, 'output');
const MANIFEST_PATH = path.join(TESTS_DIR, 'manifest.json');
const PARSER_MAIN = path.join(ROOT, 'C-main.js');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runParser(filePath) {
  try {
    const xml = execFileSync('node', [PARSER_MAIN, '-i', filePath], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, xml, error: '' };
  } catch (e) {
    const stdout = (e.stdout || '').toString();
    const stderr = (e.stderr || '').toString();
    return {
      ok: false,
      xml: stdout,
      error: `${stderr}\n${stdout}`.trim()
    };
  }
}

function validateXmlWellFormed(xml) {
  if (!xml || !xml.includes('<translationUnit')) {
    return { ok: false, reason: 'Missing <translationUnit> root element' };
  }

  const cleaned = xml.replace(/<\?xml[^>]*\?>/g, '');
  const tagRegex = /<\/?([A-Za-z_][A-Za-z0-9_\-]*)\b[^>]*>/g;
  const stack = [];
  let m;

  while ((m = tagRegex.exec(cleaned)) !== null) {
    const full = m[0];
    const name = m[1];
    const isClose = full.startsWith('</');
    const selfClose = full.endsWith('/>');

    if (isClose) {
      const top = stack.pop();
      if (top !== name) {
        return { ok: false, reason: `Tag mismatch: expected </${top || '(none)'}> but found </${name}>` };
      }
    } else if (!selfClose) {
      stack.push(name);
    }
  }

  if (stack.length > 0) {
    return { ok: false, reason: `Unclosed tags: ${stack.join(', ')}` };
  }

  return { ok: true, reason: '' };
}

function hasTag(xml, tag) {
  const re = new RegExp(`<${tag}(\\s|>|/)`);
  return re.test(xml);
}

function saveXml(outRelPath, xml) {
  const outPath = path.join(OUTPUT_DIR, outRelPath.replace(/\.c$/, '.xml'));
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, xml, 'utf8');
}

function firstErrorLine(err) {
  if (!err) return 'Unknown parser error';
  const lines = err.split('\n').map((l) => l.trim()).filter(Boolean);
  const preferred = lines.find((l) => /syntax error|lexical analysis failed|while expecting|at line/i.test(l));
  return preferred || lines[0] || 'Unknown parser error';
}

function run() {
  const manifest = readJson(MANIFEST_PATH);
  ensureDir(OUTPUT_DIR);

  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log('C Parser XML Test Suite');
  console.log('============================================================');

  for (const tc of manifest.positive) {
    const fixturePath = path.join(FIXTURES_DIR, tc.file);
    process.stdout.write(`${tc.file.padEnd(38)} ... `);

    if (!fs.existsSync(fixturePath)) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: fixture not found`);
      continue;
    }

    const result = runParser(fixturePath);
    if (!result.ok) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: parser failed unexpectedly (${firstErrorLine(result.error)})`);
      continue;
    }

    saveXml(tc.file, result.xml);

    const xmlValidation = validateXmlWellFormed(result.xml);
    if (!xmlValidation.ok) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: invalid XML (${xmlValidation.reason})`);
      continue;
    }

    const missingTags = (tc.expectTags || []).filter((tag) => !hasTag(result.xml, tag));
    if (missingTags.length > 0) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: missing expected tags: ${missingTags.join(', ')}`);
      continue;
    }

    console.log('✓ PASS');
    passed++;
  }

  for (const tc of manifest.negative) {
    const fixturePath = path.join(FIXTURES_DIR, tc.file);
    process.stdout.write(`${tc.file.padEnd(38)} ... `);

    if (!fs.existsSync(fixturePath)) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: fixture not found`);
      continue;
    }

    const result = runParser(fixturePath);
    if (result.ok) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: expected parser failure, but it succeeded`);
      continue;
    }

    const errLower = result.error.toLowerCase();
    const expected = (tc.expectError || '').toLowerCase();
    if (expected && !errLower.includes(expected)) {
      console.log('✗ FAIL');
      failed++;
      failures.push(`${tc.file}: expected error containing "${tc.expectError}", got "${firstErrorLine(result.error)}"`);
      continue;
    }

    console.log('✓ PASS');
    passed++;
  }

  console.log('============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`${i + 1}. ${f}`));
    process.exit(1);
  }

  process.exit(0);
}

run();
