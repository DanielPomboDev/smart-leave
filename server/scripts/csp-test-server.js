// Temporary local test: serve client/dist (built with the production
// VITE_API_URL) with the exact security headers vercel.json applies,
// so the production app can be click-tested against the live API.
const express = require('express');
const path = require('path');

const app = express();
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');

const CSP =
  "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https:; upgrade-insecure-requests";

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(distDir));
app.get(/^(?!\/assets\/|\/images\/|\/favicon|\/logo|\/manifest|\/robots).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(8080, () => console.log('prod-mirror on http://localhost:8080'));
