# Bracket Bond — docs site

A runnable [Fumadocs](https://fumadocs.dev) (Next.js) documentation site, styled
after MystenLabs' WalrusStreamKit docs.

## Run

```bash
cd docs-site
pnpm install         # postinstall generates .source/ from content/docs
pnpm dev             # → http://localhost:3002  (redirects to /docs)
```

`pnpm build && pnpm start` for a production build.

## Layout

```
content/docs/          # the pages (MDX + meta.json) — the actual documentation
├── index.mdx          # overview · component table · architecture · devnet resources
├── getting-started.mdx
├── settlement.mdx     # the proof-settled differentiator
├── architecture.mdx
└── txline.mdx         # endpoints · auth · validateStatV2 · references · API feedback
app/                   # Next.js app router (root → /docs)
components/            # Mermaid diagram component
lib/                   # Fumadocs source loader + layout options
```

Components in use: `<Callout>`, `<Cards>` / `<Card>` (from `fumadocs-ui`) and
`<Mermaid>` (local). Tables, code, and Mermaid also render on GitHub.

## For the hackathon submission

- **Technical documentation** → `content/docs/index.mdx` + `architecture.mdx`.
- **TxLINE endpoints used** → the table + References in `content/docs/txline.mdx`.
- **API feedback** → `txline.mdx` § *What we hit* / *What we liked*.
