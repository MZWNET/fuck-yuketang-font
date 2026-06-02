# fuck-yuketang-font

![coverage](badges/coverage.svg)

**Fuck yuketang's font encryption, take the real characters back!!!!!**

A userscript for Yuketang student exercise pages. It captures encrypted question fonts, builds glyph-to-Unicode mappings, and replaces encrypted-font text with readable plaintext.

The script targets `*://www.yuketang.cn/v2/web/cloud/student/exercise/*`.

## Features

- Decrypts characters marked with `xuetangx-com-encrypted-font`.
- Watches dynamic page updates and SPA route changes.
- Shows a Solid status panel for enabling, pausing, tracking, and copying decrypted text.
- Purely frontend, no backend needed.

## Local build

Build the userscript and install the generated file from `dist/` in a userscript manager such as Tampermonkey.

```bash
pnpm install --frozen-lockfile
pnpm build
```

For local development:

```bash
pnpm dev
```

## License

MIT

## Credits

- [TonyYu02/Auto-Problem-Decrypt](https://github.com/TonyYu02/Auto-Problem-Decrypt)
- [MuWinds/yuketangHelperBUU](https://github.com/MuWinds/yuketangHelperBUU)
