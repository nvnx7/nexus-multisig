import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

/**
 * Nexus – Institutional Green Financial System
 * Custom theme configuration using Chakra UI v3 createSystem.
 */

const config = defineConfig({
  // ── Global base styles ─────────────────────────────────────────────────────
  globalCss: {
    "html, body": {
      bg: "bg.canvas",
      color: "fg.default",
      fontFamily: "body",
      fontFeatureSettings: '"cv11", "ss01"',
      textRendering: "optimizeLegibility",
    },
    "::selection": {
      bg: "brand.solid",
      color: "white",
    },
    // Refined, unobtrusive scrollbars
    "*::-webkit-scrollbar": {
      width: "10px",
      height: "10px",
    },
    "*::-webkit-scrollbar-track": {
      bg: "transparent",
    },
    "*::-webkit-scrollbar-thumb": {
      bg: "border.emphasized",
      borderRadius: "full",
      border: "3px solid transparent",
      backgroundClip: "content-box",
    },
    "*::-webkit-scrollbar-thumb:hover": {
      bg: "fg.subtle",
    },
  },

  theme: {
    tokens: {
      colors: {
        // Institutional Green primary palette
        green: {
          50: { value: "#e8f5ef" },
          100: { value: "#b6efd1" },
          200: { value: "#9bd3b6" },
          300: { value: "#7eb59a" },
          400: { value: "#52a07d" },
          500: { value: "#336851" },
          600: { value: "#19503a" },
          700: { value: "#0d4732" },
          800: { value: "#002f1f" },
          900: { value: "#002114" },
          950: { value: "#001409" },
        },
        // Semantic status palettes
        success: {
          500: { value: "#10b981" },
          600: { value: "#0a6b44" },
        },
        warning: {
          500: { value: "#f59e0b" },
          600: { value: "#92400e" },
        },
        danger: {
          50: { value: "#ffdad6" },
          500: { value: "#ba1a1a" },
          600: { value: "#93000a" },
          950: { value: "#0b0000" },
        },
      },
      fonts: {
        heading: { value: "var(--font-ibm-plex-sans), 'IBM Plex Sans', sans-serif" },
        body: { value: "var(--font-inter), 'Inter', sans-serif" },
        mono: { value: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" },
      },
    },
    semanticTokens: {
      colors: {
        // Brand Green Colors
        "brand.solid": { value: "{colors.green.700}" },          // #0D4732
        "brand.emphasis": { value: "{colors.green.800}" },        // #002F1F
        "brand.muted": { value: "{colors.green.600}" },           // #19503A
        "brand.subtle": { value: "{colors.green.50}" },
        "brand.text": { value: "{colors.green.300}" },            // muted green text on dark
        "brand.inverseText": { value: "{colors.green.200}" },     // lighter for inverse surfaces

        // Surface tokens
        "bg.canvas": { value: "#f4f7f5" },                        // soft green-tinted app background
        "fg.onPrimary": { value: "{colors.white}" },              // text/icons on brand.solid surfaces

        // Border overrides
        "border.emphasis": { value: "{colors.green.300}" },

        // Status Colors
        "status.success": { value: "{colors.success.600}" },
        "status.successBg": { value: "#e6f4ee" },
        "status.warning": { value: "{colors.warning.600}" },
        "status.warningBg": { value: "#fef3c7" },
        "status.danger": { value: "{colors.danger.500}" },
        "status.dangerBg": { value: "{colors.danger.50}" },
      },
      shadows: {
        // Brand-tinted, layered elevations for a soft, premium feel
        surface: {
          value: "0px 1px 2px rgba(0, 47, 31, 0.04), 0px 2px 6px rgba(0, 47, 31, 0.05)",
        },
        hover: {
          value: "0px 4px 12px rgba(0, 47, 31, 0.10), 0px 2px 5px rgba(0, 47, 31, 0.06)",
        },
      },
      radii: {
        // Soften the global control radius (buttons, inputs use l2)
        l2: { value: "{radii.md}" },
        l3: { value: "{radii.lg}" },
      },
    },
    recipes: {
      button: {
        defaultVariants: {
          colorPalette: "green",
        },
      },
      input: {
        defaultVariants: {
          colorPalette: "green",
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
