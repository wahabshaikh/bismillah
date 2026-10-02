# @bismillah/ui

The web app's [shadcn/ui](https://ui.shadcn.com) components and design tokens, set up the way
shadcn's [monorepo guide](https://ui.shadcn.com/docs/monorepo) describes. It uses the
`base-nova` style ([Base UI](https://base-ui.com) primitives), Tailwind CSS v4 and
[Lucide](https://lucide.dev) icons.

```
src/
├── components/    # shadcn primitives: button, card, input, ...
├── hooks/
├── lib/utils.ts   # cn()
└── styles/globals.css
```

## Using it

Apps load one stylesheet, which brings in Tailwind, the tokens and the scan paths:

```tsx
import appCss from "@bismillah/ui/globals.css?url";
```

Import components by path:

```tsx
import { Button, buttonVariants } from "@bismillah/ui/components/button";
import { cn } from "@bismillah/ui/lib/utils";

<Button variant="outline">Cancel</Button>
<a href="/docs" className={buttonVariants({ size: "sm" })}>Docs</a>
```

## Adding components

Run the shadcn CLI from the app, not from this package, so it can put each file in the right
workspace (`apps/web/components.json` points `ui` here):

```sh
cd apps/web
pnpm dlx shadcn@latest add dialog
```

Generated files are plain source you own: edit them freely. The CLI writes its own formatting,
so run `pnpm format` from the repo root afterwards.

## Theming

`globals.css` defines shadcn's color tokens (`--primary`, `--muted-foreground`, ...) in OKLCH.
They follow the operating system's light or dark setting through `prefers-color-scheme`, and
`dark:` utilities do too. The mobile app mirrors the same values in `apps/mobile/src/theme.ts`,
so change both together. To use a class-based toggle instead, move the dark values under a
`.dark` selector and add `@custom-variant dark (&:is(.dark *));`.

Like every internal package, it ships TypeScript source; the app's bundler compiles it.
