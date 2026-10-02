# @bismillah/ui

Shared React components (`Button`, `Input`, `Label`, `Select`, `Card`, `Alert`) and design tokens for the
web app, styled with [Tailwind CSS v4](https://tailwindcss.com).

```css
/* your app's stylesheet */
@import "tailwindcss";
@import "@bismillah/ui/theme.css";
```

`theme.css` defines the color tokens (`bg-primary`, `text-muted-foreground`, ...), switches them
for dark mode with `prefers-color-scheme`, and tells Tailwind to scan this package's source, so
apps don't need their own `@source` line for it.

```tsx
import { Button, buttonClassName } from "@bismillah/ui";

<Button variant="secondary">Cancel</Button>
<a href="/docs" className={buttonClassName({ size: "sm" })}>Docs</a>
```

Like every internal package, it ships TypeScript source; the app's bundler compiles it.
