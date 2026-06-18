---
name: Institutional Green Financial System
colors:
  surface: "#f7f9fb"
  surface-dim: "#d8dadc"
  surface-bright: "#f7f9fb"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f2f4f6"
  surface-container: "#eceef0"
  surface-container-high: "#e6e8ea"
  surface-container-highest: "#e0e3e5"
  on-surface: "#191c1e"
  on-surface-variant: "#404943"
  inverse-surface: "#2d3133"
  inverse-on-surface: "#eff1f3"
  outline: "#707973"
  outline-variant: "#c0c9c2"
  surface-tint: "#336851"
  primary: "#002f1f"
  on-primary: "#ffffff"
  primary-container: "#0d4732"
  on-primary-container: "#7eb59a"
  inverse-primary: "#9bd3b6"
  secondary: "#515f74"
  on-secondary: "#ffffff"
  secondary-container: "#d5e3fd"
  on-secondary-container: "#57657b"
  tertiary: "#002f21"
  on-tertiary: "#ffffff"
  tertiary-container: "#004834"
  on-tertiary-container: "#6eb89a"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#b6efd1"
  primary-fixed-dim: "#9bd3b6"
  on-primary-fixed: "#002114"
  on-primary-fixed-variant: "#19503a"
  secondary-fixed: "#d5e3fd"
  secondary-fixed-dim: "#b9c7e0"
  on-secondary-fixed: "#0d1c2f"
  on-secondary-fixed-variant: "#3a485c"
  tertiary-fixed: "#a6f2d1"
  tertiary-fixed-dim: "#8bd6b6"
  on-tertiary-fixed: "#002116"
  on-tertiary-fixed-variant: "#00513b"
  background: "#f7f9fb"
  on-background: "#191c1e"
  surface-variant: "#e0e3e5"
typography:
  display-lg:
    fontFamily: IBM Plex Sans
    fontSize: 48px
    fontWeight: "600"
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: "500"
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-tablet: 32px
  margin-mobile: 16px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 48px
---

## Brand & Style

The design system is engineered for high-stakes financial environments, evoking a sense of heritage, stability, and absolute precision. The brand personality is **Institutional, Authoritative, and Transparent**. It avoids trendy ephemeral patterns in favor of a **Corporate Modern** aesthetic that prioritizes information density and clarity.

The visual language draws from traditional banking—using deep greens and structured layouts—while utilizing modern interface principles like generous whitespace and systematic typography. The emotional response should be one of "calm confidence," where the user feels they are interacting with a resilient, world-class financial institution.

## Colors

The palette is centered around **Institutional Green**, a deep, forest-inflected emerald that signals growth and security.

- **Primary (#0D4732):** Used for key brand moments, primary actions, and active navigation states. It provides the "anchor" for the visual hierarchy.
- **Secondary (#334155):** A muted slate used for secondary interface elements, icons, and supporting text to balance the richness of the green.
- **Surface System:** The interface utilizes a tiered "Paper" model. Surfaces are primarily white (#FFFFFF) to maintain a clean, analytical feel, with background layers using cool-toned neutrals to distinguish content areas without adding visual noise.
- **Semantic Logic:** Standard financial indicators (success/error) are tuned to work harmoniously with the forest green primary color, ensuring that "Positive Green" (#10B981) is distinct and significantly brighter than the "Brand Green" to avoid functional confusion.

## Typography

This design system employs a multi-typeface strategy to separate brand expression from data utility.

1.  **IBM Plex Sans (Headlines):** Chosen for its "engineered" look that bridges the gap between the humanities and technology. Use this for all structural headings and page titles.
2.  **Inter (Body):** The workhorse for the UI. It provides maximum legibility in dense financial tables and long-form reporting.
3.  **JetBrains Mono (Labels/Data):** Used for numerical data, status chips, and technical labels. The monospaced nature ensures that columns of numbers align perfectly, aiding in rapid data scanning.

**Hierarchy Note:** Always prioritize readability over style. Avoid all-caps except for the smallest `label-sm` tier to ensure the interface remains accessible and professional.

## Layout & Spacing

The design system utilizes a **Fixed Grid** model for desktop to maintain optimal line lengths for data analysis, transitioning to a fluid model for smaller viewports.

- **Grid:** A 12-column grid system is used for all main layouts. Gutters are fixed at 24px to provide enough breathing room between dense data modules.
- **Spacing Rhythm:** Based on a 4px baseline grid. All padding and margins must be multiples of 4 (4, 8, 12, 16, 24, 32, 48, 64).
- **Responsive Behavior:**
  - **Desktop (1200px+):** 12 columns, 64px margins.
  - **Tablet (768px - 1199px):** 8 columns, 32px margins.
  - **Mobile (<767px):** 4 columns, 16px margins. Complex data tables should trigger horizontal scroll or card-view transformations on mobile.

## Elevation & Depth

To maintain a "serious" and "institutional" feel, depth is conveyed through **Low-contrast Outlines** and **Tonal Layers** rather than dramatic shadows.

- **Level 0 (Background):** Neutral (#F8FAFC). Used for the lowest layer of the application.
- **Level 1 (Card/Surface):** White (#FFFFFF) with a 1px border (#E2E8F0). This is the standard for content containers.
- **Level 2 (Hover/Active):** A very soft, diffused shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) is used only for interactive elements like cards or dropdowns to indicate they are "lifted" from the page.
- **Level 3 (Modals/Overlays):** Utilizes a darker primary-tinted scrim (30% opacity of #0D4732) to focus the user's attention while maintaining brand presence.

## Shapes

The shape language is **Soft (0.25rem)**. This subtle rounding removes the harshness of 90-degree corners—making the UI feel contemporary—without sacrificing the precision associated with a "sharp" professional tool.

- **Standard Elements:** Buttons, inputs, and small cards use the base 4px (0.25rem) radius.
- **Large Containers:** Section headers or large dashboard modules use the `rounded-lg` (8px) token.
- **Interactive Feedback:** Focus states should follow the radius of the parent element with a 2px offset to ensure the shape language is preserved even during keyboard navigation.

## Components

### Buttons

- **Primary:** Solid #0D4732 background with white text. No gradient. High-contrast and authoritative.
- **Secondary:** Transparent background with #0D4732 border and text.
- **Ghost:** Transparent background with #475569 text, turning to a light green tint on hover.

### Input Fields

- Use a 1px border (#CBD5E1) that shifts to #0D4732 on focus.
- Labels must always be visible (never use placeholder-only labels) to support the professional requirement for clarity.

### Data Tables

- The core of the system. Use alternating row stripes (Zebra striping) using #F8FAFC for better horizontal scanning.
- Headers should be #F1F5F9 with `label-sm` typography in deep slate.

### Chips & Status

- Use subtle background tints (e.g., 10% opacity of the semantic color) with a darker text color. Status indicators should use JetBrains Mono to differentiate from standard UI text.

### Cards

- Clean, white surfaces with the subtle 1px border. Avoid heavy shadows; let the layout and spacing define the hierarchy.
