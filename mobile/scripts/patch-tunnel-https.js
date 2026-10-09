/**
 * Expo CLI prints an exp:// QR for tunnel mode. Expo Go fetches that as http://.
 * This project's ngrok tunnel only responds on HTTPS, so the download fails with
 * "java.io.IOException: Failed to download remote update".
 * Rewrite exp -> exps and http -> https when the tunnel URL is already https.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'server',
  'UrlCreator.js'
);

const needle = `const parsed = new (_url()).URL(tunnelUrl);
        return {
            port: parsed.port,
            hostname: parsed.hostname,
            protocol: options.scheme ?? 'http'
        };`;
const replacement = `const parsed = new (_url()).URL(tunnelUrl);
        const scheme = options.scheme ?? 'http';
        const tunnelIsHttps = String(parsed.protocol || '').toLowerCase() === 'https:';
        let protocol = scheme;
        if (tunnelIsHttps && scheme === 'http') protocol = 'https';
        if (tunnelIsHttps && scheme === 'exp') protocol = 'exps';
        return {
            port: parsed.port,
            hostname: parsed.hostname,
            protocol
        };`;

if (!fs.existsSync(target)) {
  console.warn('Expo CLI UrlCreator.js not found; tunnel HTTPS patch skipped.');
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');
if (source.includes("if (tunnelIsHttps && scheme === 'exp') protocol = 'exps'")) {
  process.exit(0);
}

const hits = source.split(needle).length - 1;
if (hits !== 1) {
  console.warn(`Tunnel HTTPS patch skipped (expected 1 match, found ${hits}).`);
  process.exit(0);
}

fs.writeFileSync(target, source.replace(needle, replacement));
console.log('Patched Expo tunnel URLs to use HTTPS (exps://).');
