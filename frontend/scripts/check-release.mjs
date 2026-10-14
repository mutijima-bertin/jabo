// Read-only release smoke checks. No forms are submitted and no CMS records are changed.
import assert from 'node:assert/strict';
const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:3011';
const canonicalOrigin = process.env.EXPECTED_SITE_ORIGIN || 'https://creativesoundstudio.rw';
const results = [];
async function check(path, verify) {
  const start = Date.now();
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), redirect: 'manual' });
  const body = await response.text();
  verify(response, body);
  results.push({ path, status: response.status, milliseconds: Date.now() - start, bytes: Buffer.byteLength(body) });
  return body;
}
for (const locale of ['en', 'rw']) {
  for (const route of ['', '/portfolio', '/services', '/about', '/book', '/contact', '/blog']) {
    const path = `/${locale}${route}`;
    await check(path, (res, html) => {
      assert.equal(res.status, 200, path);
      assert.match(html, new RegExp(`<html[^>]+lang="${locale}"`), `Language: ${path}`);
      assert.ok(html.includes(`rel="canonical" href="${canonicalOrigin}${path}"`), `Canonical: ${path}`);
      assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `One main heading: ${path}`);
      assert.ok(res.headers.get('content-security-policy')?.includes("frame-ancestors 'self'"), `CSP: ${path}`);
      assert.ok(!html.includes('This page could not load'), `Error boundary: ${path}`);
    });
  }
}
await check('/', res => { assert.equal(res.status, 308); assert.equal(new URL(res.headers.get('location'), origin).pathname, '/en'); });
for (const route of ['/login', '/account', '/admin/login']) {
  await check(route, (res, html) => { assert.equal(res.status, 200); assert.ok(/name="robots" content="[^"]*noindex/.test(html), `Noindex: ${route}`); });
}
await check('/track', res => assert.equal(res.status, 200));
const catalog = JSON.parse(await check('/api/public/portfolio', res => assert.equal(res.status, 200)));
const project = catalog.find(item => item.published);
if (project) {
  for (const locale of ['en', 'rw']) {
    const path = `/${locale}/portfolio/${encodeURIComponent(project.id)}`;
    await check(path, (res, html) => { assert.equal(res.status, 200); assert.ok(html.includes(`rel="canonical" href="${canonicalOrigin}${path}"`)); });
  }
}
await check('/en/portfolio/phase4-nonexistent-project', (res, html) => {
  // Next can stream a notFound response with HTTP 200; robots must still exclude it.
  assert.ok([200,404].includes(res.status)); assert.match(html, /name="robots" content="[^"]*noindex/);
});
await check('/sitemap.xml', (res, xml) => { assert.equal(res.status, 200); assert.ok(xml.includes(`${canonicalOrigin}/en`)); if(project) assert.ok(xml.includes(`/en/portfolio/${project.id}`)); });
await check('/favicon.ico', res => assert.equal(res.status, 200));
console.log(JSON.stringify({ origin, checked: results.length, results }, null, 2));
