import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { marked } from 'marked'

const spec = readFileSync('SPEC.md', 'utf-8')
const body = marked.parse(spec)

// Get last commit date of SPEC.md for sitemap lastmod
const lastmod = execSync('git log -1 --format=%cI SPEC.md', { encoding: 'utf-8' }).trim().slice(0, 10)

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podcast Annotation Format</title>
  <meta name="description" content="An open spec for timestamped entity annotations on podcast and spoken media content.">
  <meta property="og:title" content="Podcast Annotation Format">
  <meta property="og:description" content="WebVTT tells you what was said. Podcast annotations tell you what was said about.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.podcastannotation.org">
  <link rel="canonical" href="https://www.podcastannotation.org">
  <style>
    :root {
      --text: #1a1a1a;
      --muted: #555;
      --border: #ddd;
      --bg: #fff;
      --code-bg: #f5f5f5;
      --link: #1a6bc4;
      --max-width: 720px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --text: #e0e0e0;
        --muted: #999;
        --border: #333;
        --bg: #151515;
        --code-bg: #1e1e1e;
        --link: #5ba3e6;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: var(--text);
      background: var(--bg);
      line-height: 1.65;
      padding: 3rem 1.5rem 4rem;
      max-width: var(--max-width);
      margin: 0 auto;
    }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.35rem; margin-top: 2.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
    h3 { font-size: 1.1rem; margin-top: 1.75rem; margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; }
    a { color: var(--link); text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.35rem; }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.875em;
      background: var(--code-bg);
      padding: 0.15em 0.35em;
      border-radius: 3px;
    }
    pre {
      background: var(--code-bg);
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 1rem;
      line-height: 1.45;
    }
    pre code { background: none; padding: 0; font-size: 0.825em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
    th { font-weight: 600; }
    blockquote {
      border-left: 3px solid var(--border);
      padding: 0.5rem 1rem;
      margin-bottom: 1rem;
      color: var(--muted);
    }
    strong { font-weight: 600; }
    em { font-style: italic; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <article id="spec">
${body}
  </article>
  <footer>
    Developed by <a href="https://getcarcurious.com">Car Curious</a> &middot;
    <a href="https://github.com/ryanwi/podcast-annotations-js">GitHub</a> &middot;
    <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
  </footer>
</body>
</html>`

writeFileSync('docs/index.html', html)
console.log('docs/index.html updated')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.podcastannotation.org/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`

writeFileSync('docs/sitemap.xml', sitemap)
console.log('docs/sitemap.xml updated')
