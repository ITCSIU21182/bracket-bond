# Bracket Bond — docs

Professional technical documentation for Bracket Bond, written as **Fumadocs**
MDX content (styled after MystenLabs' WalrusStreamKit docs).

```
content/docs/
├── index.mdx           # what it is · component table · architecture · devnet resources
├── getting-started.mdx # build · test · deploy · prove a settlement
├── settlement.mdx      # the differentiator: proof-settled resolution (validate_stat CPI)
├── architecture.mdx    # accounts · instructions · solvency model
├── txline.mdx          # exact endpoints · auth · validateStatV2 · API feedback
└── meta.json           # nav order
```

## Rendering

The pages use Fumadocs MDX components (`<Callout>`, `<Cards>` / `<Card>`,
`<Mermaid>`). To serve them, drop `content/docs` into a
[Fumadocs](https://fumadocs.dev) Next.js app (`fumadocs-ui` + `fumadocs-mdx`), or
read them as MDX. Tables, code blocks, and Mermaid diagrams also render on GitHub.

## For the hackathon submission

- **Technical documentation** → `index.mdx` (overview) + `architecture.mdx`.
- **TxLINE endpoints used** → the table in `txline.mdx`.
- **API feedback** → `txline.mdx` § *What we hit* / *What we liked*.
