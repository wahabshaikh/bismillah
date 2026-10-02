import { useColorScheme } from "react-native";

/** The same design tokens as `@bismillah/ui/globals.css`, converted from OKLCH to hex. */
const palettes = {
  light: {
    background: "#fcfcfc",
    foreground: "#16181d",
    muted: "#f0f2f5",
    mutedForeground: "#5d646f",
    border: "#dfe1e5",
    primary: "#d64d00",
    primaryForeground: "#fcfcfc",
    danger: "#df2225",
    dangerForeground: "#fcfcfc",
  },
  dark: {
    background: "#0d1014",
    foreground: "#f0f2f5",
    muted: "#1a1d22",
    mutedForeground: "#999fa8",
    border: "#2b2e33",
    primary: "#ef7926",
    primaryForeground: "#0d1014",
    danger: "#f14d4c",
    dangerForeground: "#0d1014",
  },
};

export type Colors = (typeof palettes)["light"];

export const radius = { md: 8, lg: 12 };

/** Colors for the device's light or dark appearance. */
export function useColors(): Colors {
  return palettes[useColorScheme() === "dark" ? "dark" : "light"];
}
