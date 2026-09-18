# Bundled fonts

Two variable woff2 families, both SIL Open Font License 1.1 (OFL):

| File | Family | Axis | Source |
|---|---|---|---|
| `Sora[wght].woff2` | Sora | `wght` 100–800 | Google Fonts (`fonts.google.com/specimen/Sora`), designed by Jonny Pinhorn |
| `JetBrainsMono[wght].woff2` | JetBrains Mono | `wght` 100–800 | Google Fonts (`fonts.google.com/specimen/JetBrains+Mono`), by JetBrains |

Downloaded via the Google Fonts `css2` API (`family=Sora:wght@100..800`,
`family=JetBrains+Mono:wght@100..800`) with a Safari user agent so the
response serves a single variable woff2 per family (`latin` subset) instead
of per-weight static woff files.

If either file is missing here, re-fetch it the same way, or drop in the
upstream release's variable woff2 from the font's own repository
(`github.com/impallari/Sora`, `github.com/JetBrains/JetBrainsMono`) — same
filename, same `wght` axis range.

## LICENSE-OFL.txt

Both families are licensed under the SIL Open Font License, Version 1.1
(https://scripts.sil.org/OFL). Summary of the terms that apply here:

- Free to use, study, modify and redistribute, embedded in this application,
  without royalty.
- The font files may be bundled, embedded and distributed as part of this
  software.
- Modified versions must be renamed and may not use the original font's
  "Reserved Font Name".
- The license text itself must accompany any redistribution of the font
  files — this note stands in for it; the full OFL 1.1 text is at
  https://openfontlicense.org and is not duplicated here to keep this
  directory small.
- No warranty is provided by the font authors.

Full copyright:

- Sora — Copyright 2019 The Sora Project Authors
  (https://github.com/impallari/Sora)
- JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors
  (https://github.com/JetBrains/JetBrainsMono)
