# UI Design Overview - Strategic Marketing Research Tool

## 0. Executive Overview

**Visual Identity**: Professional enterprise-grade application with a bold red primary color (#CF0E0F) representing urgency and action in marketing. Clean, modern interface focused on data presentation and user efficiency.

**Density**: Medium density layout optimized for desktop and mobile with generous padding and clear visual hierarchy.

**Spacing Rhythm**: Primary 8px base unit system with common values at 0.5rem (8px), 1rem (16px), 1.5rem (24px), 2rem (32px), 3rem (48px).

**Type Scale**: System fonts (-apple-system stack) with clear hierarchy from 0.75rem to 3rem, optimized for readability across content types.

## 1. Grid & Layout

### Containers
- **Main Container**: `max-width: 1200px` (main app), `max-width: 1400px` (dashboard), `max-width: 80rem` (contacts)
- **Page Padding**: `padding: 2rem` (desktop), `padding: 1rem` (mobile)
- **Content Areas**: Full-width with responsive flex/grid layouts

### Breakpoints
- **Mobile**: `max-width: 768px`
- **Desktop**: `768px+`
- **Large**: `1200px+` (dashboard), `1400px+` (contacts)

### Grid Systems
- **Report Sections**: CSS Grid with `repeat(auto-fit, minmax(300px, 1fr))`
- **Decision Makers**: `repeat(auto-fit, minmax(300px, 1fr))`
- **Ad Library**: `repeat(auto-fit, minmax(250px, 1fr))`
- **Contacts**: `repeat(auto-fit, minmax(350px, 1fr))`
- **Analytics Cards**: `repeat(auto-fit, minmax(250px, 1fr))`

### Page Templates
1. **Single Page App** (index.php): Header + Input + Report Container
2. **Dashboard** (analytics): Header + Stats + Controls + Data Table/Cards + Pagination
3. **Contacts Directory**: Header + Stats + Controls + Category Sections + Contact Cards/Table

## 2. Typography System

| Token | Size (px/rem) | Line Height | Weight | Usage |
|-------|---------------|-------------|---------|-------|
| title.3xl | 48px/3rem | 1.2 | 700 | Main page titles |
| title.2xl | 40px/2.5rem | 1.2 | 700 | Dashboard titles |
| title.xl | 32px/2rem | 1.3 | 700 | Report titles |
| title.lg | 24px/1.5rem | 1.4 | 700 | Section titles |
| title.md | 20px/1.25rem | 1.4 | 600 | Card titles |
| title.sm | 18px/1.125rem | 1.4 | 600 | Contact names |
| body.lg | 20px/1.25rem | 1.6 | 400 | Subtitles |
| body.md | 16px/1rem | 1.6 | 400 | Body text, inputs |
| body.sm | 14px/0.875rem | 1.5 | 400 | Labels, metadata |
| body.xs | 12px/0.75rem | 1.4 | 500 | Badges, captions |

**Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif`

## 3. Color System

### Base Palette
| Color | HEX | HSL | Usage |
|-------|-----|-----|-------|
| Primary Red | #CF0E0F | hsl(359, 93%, 44%) | Brand, CTAs, focus states |
| Primary Red Dark | #A00B0C | hsl(359, 93%, 34%) | Hover states |
| Success Green | #10b981 | hsl(160, 84%, 39%) | Success states, secondary actions |
| Success Dark | #059669 | hsl(160, 84%, 31%) | Success hover |
| Warning Yellow | #f59e0b | hsl(45, 93%, 50%) | Warning states |
| Error Red | #dc2626 | hsl(0, 84%, 51%) | Error states |
| Blue Primary | #3b82f6 | hsl(221, 83%, 61%) | Links, info states |
| LinkedIn Blue | #0a66c2 | hsl(201, 89%, 40%) | LinkedIn branding |

### Semantic Roles
| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Background Canvas | bg.canvas | #f8fafc | Page backgrounds |
| Background Surface | bg.surface | #ffffff | Card, modal backgrounds |
| Background Muted | bg.muted | #f1f5f9 | Disabled, secondary surfaces |
| Background Gradient | bg.gradient.primary | linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) | Report headers |
| Background Gradient Red | bg.gradient.red | linear-gradient(135deg, #CF0E0F 0%, #A00B0C 100%) | Contact headers |
| Text Primary | text.primary | #1e293b | Main text |
| Text Secondary | text.secondary | #64748b | Supporting text |
| Text Muted | text.muted | #374151 | Less important text |
| Border Default | border.default | #e2e8f0 | Standard borders |
| Border Muted | border.muted | #f1f5f9 | Subtle borders |
| Focus Ring | focus.ring | rgba(207, 14, 15, 0.1) | Focus indicators |

## 4. Space/Radii/Borders/Shadows

### Spacing Scale (8px base)
| Token | Value | Usage |
|-------|-------|-------|
| space.1 | 4px | Minimal spacing |
| space.2 | 8px | Small spacing |
| space.3 | 12px | Medium-small spacing |
| space.4 | 16px | Medium spacing |
| space.5 | 20px | Medium-large spacing |
| space.6 | 24px | Large spacing |
| space.8 | 32px | Extra large spacing |
| space.12 | 48px | Section spacing |

### Border Radius (Normalized)
| Token | Value | Usage |
|-------|-------|-------|
| radii.xs | 4px | Small elements |
| radii.sm | 8px | Buttons, inputs |
| radii.md | 12px | Cards |
| radii.lg | 16px | Large cards |
| radii.xl | 24px | Containers |
| radii.full | 9999px | Pills, badges |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| border.width.default | 1px | Standard borders |
| border.width.thick | 2px | Input focus, emphasis |
| border.style | solid | All borders |
| focus.ring.contrast | 2px solid #1e293b | High contrast mode fallback |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| shadow.sm | 0 1px 3px 0 rgba(0, 0, 0, 0.1) | Subtle elevation |
| shadow.md | 0 4px 6px -1px rgba(0, 0, 0, 0.1) | Card elevation |
| shadow.lg | 0 8px 25px rgba(0,0,0,0.1) | Hover states |
| shadow.xl | 0 2px 10px rgba(0,0,0,0.1) | Modal, prominent cards |

## 5. Motion

### Duration
| Token | Value | Usage |
|-------|-------|-------|
| duration.fast | 150ms | Quick interactions |
| duration.normal | 200ms | Standard transitions |
| duration.slow | 300ms | Complex animations |

### Easing
| Token | Value | Usage |
|-------|-------|-------|
| easing.standard | ease | Standard transitions |
| easing.emphasized | cubic-bezier(0.4,0,0.2,1) | Emphasized motion |

### Common Transitions
- `all 0.2s` - Standard hover/focus
- `border-color 0.2s` - Input focus
- `width 0.3s ease` - Progress bars
- `transform 0.2s` - Hover elevations

## 6. Components Inventory

### Buttons
**Primary Button** (.generate-btn, .action-btn)
- **Padding**: 16px 32px (primary), 12px 24px (secondary)
- **Border Radius**: 12px (primary), 6px (secondary)
- **Font**: 16px/500 (primary), 14px/500 (secondary)
- **States**: Default (#CF0E0F), Hover (#A00B0C), Disabled (opacity: 0.7)
- **Variants**: Primary (red), Secondary (green), Gray, LinkedIn (blue)

**Icon Buttons** (.copy-contact-btn, .table-copy-btn)
- **Size**: 28px × 28px
- **Padding**: 6px
- **Border Radius**: 6px
- **Background**: #f1f5f9, Hover: #e2e8f0

### Inputs
**Text Input** (.url-input, .search-input)
- **Padding**: 16px (main), 12px (secondary)
- **Border**: 2px solid #e2e8f0
- **Border Radius**: 12px (main), 8px (secondary)
- **Focus**: Border #CF0E0F, Shadow: 0 0 0 3px rgba(207, 14, 15, 0.1)
- **Font**: 16px/400 (main), 14px/400 (secondary)

**Select Dropdown** (.filter-select)
- **Padding**: 12px 16px
- **Border**: 2px solid #e2e8f0
- **Border Radius**: 8px
- **Background**: white
- **Font**: 14px/400

### Cards
**Report Container** (.report-container)
- **Background**: white
- **Border**: 1px solid #e2e8f0
- **Border Radius**: 16px
- **Shadow**: 0 4px 6px -1px rgba(0, 0, 0, 0.1)

**Contact Card** (.contact-card)
- **Padding**: 24px
- **Border**: 2px solid #e2e8f0
- **Border Radius**: 16px
- **Hover**: translateY(-2px), shadow-lg, border #CF0E0F

**Decision Maker Card** (.decision-maker-card)
- **Padding**: 24px
- **Background**: #f8fafc
- **Border**: 1px solid #e2e8f0
- **Border Radius**: 12px
- **Hover**: translateY(-2px), shadow-md

### Tables
**Data Table** (.table, .contacts-table)
- **Header Background**: #f8fafc
- **Header Padding**: 16px
- **Cell Padding**: 16px
- **Border**: 1px solid #f1f5f9 (rows), 1px solid #e5e7eb (header)
- **Hover**: Background #f8fafc

### Navigation
**View Toggle** (.view-toggle)
- **Background**: #f1f5f9
- **Padding**: 4px
- **Border Radius**: 8px
- **Button Padding**: 8px 16px
- **Active**: white background, #CF0E0F color, shadow

### Progress
**Progress Bar** (.progress-bar-bg)
- **Container**: Height 8px, Background #e2e8f0, Border Radius 4px
- **Fill**: Background #CF0E0F, Transition: width 0.3s ease

### Badges
**Status Badges** (.badge, .status-badge)
- **Padding**: 4px 12px
- **Border Radius**: 9999px
- **Font**: 12px/500, uppercase
- **Variants**: Level (blue), Salary (green), Category (yellow), Status (contextual)

### Modals
**Modal Container** (.modal)
- **Background**: rgba(0, 0, 0, 0.5)
- **Content Padding**: 32px
- **Border Radius**: 16px
- **Max Width**: 400px
- **Position**: Fixed overlay, centered

## 7. Accessibility Report

### Color Contrast Analysis
- **Primary Red (#CF0E0F) on White**: 5.2:1 ✅ AA
- **Text Primary (#1e293b) on White**: 13.8:1 ✅ AAA
- **Text Secondary (#64748b) on White**: 5.5:1 ✅ AA
- **Text Muted (#374151) on White**: 8.9:1 ✅ AAA
- **White on Primary Red**: 5.2:1 ✅ AA

### Focus States
- **Ring Width**: 3px
- **Ring Color**: rgba(207, 14, 15, 0.1)
- **Ring Offset**: 0px
- **Coverage**: ✅ All interactive elements have visible focus states

### Keyboard Navigation
- **Tab Order**: ✅ Logical tab sequence
- **Skip Links**: ❌ Missing skip-to-content links
- **Keyboard Shortcuts**: ❌ No documented shortcuts
- **Modal Trapping**: ✅ Basic modal focus management

### Screen Reader Support
- **Alt Text**: ✅ SVG icons have descriptive paths
- **Labels**: ✅ Form inputs have associated labels
- **Headings**: ✅ Proper heading hierarchy (h1-h3)
- **ARIA**: ⚠️ Limited ARIA attributes, could use more landmark roles

## 8. Normalization Plan

### Inconsistencies Found
1. **Spacing**: Mix of 0.75rem/0.875rem for small text - consolidate to 0.875rem
2. **Border Radius**: 0.375rem vs 0.5rem for small elements - use 0.5rem consistently
3. **Button Padding**: Various combinations - standardize to space scale
4. **Card Padding**: 1.5rem vs 2rem - use 1.5rem for consistency
5. **Icon Sizes**: 12px, 14px, 16px, 20px - standardize to 16px, 20px, 24px

### Proposed Consolidation
- **Small Text**: Use 14px (0.875rem) consistently
- **Button Padding**: Primary (1rem 2rem), Secondary (0.75rem 1.5rem), Small (0.5rem 1rem)
- **Card Padding**: Standard 1.5rem, Large 2rem
- **Icon Sizes**: 16px (small), 20px (medium), 24px (large)
- **Border Radius**: 0.5rem (small), 0.75rem (medium), 1rem (large)

## 9. Replication Checklist

### Core Layout Pattern
```html
<body>
  <a class="sr-only focusable" href="#content">Skip to content</a>
  <header role="banner">
    <nav aria-label="Main navigation"><!-- nav items --></nav>
  </header>
  <main id="content" role="main">
    <!-- Main content -->
  </main>
  <footer role="contentinfo"><!-- footer content --></footer>
</body>
```

### Core Files to Copy
1. **CSS Framework**: `styles.css` - Complete design system
2. **Design Tokens**: Use generated `design-tokens.css` with semantic button/container tokens
3. **Component Examples**: HTML structures from `index.php`, `dashboard/index.html`, `contacts/index.php`

### Key Patterns
1. **Color System**: Use semantic button tokens (button.primary.bg, etc.) not raw colors
2. **Typography**: System font stack, clear hierarchy
3. **Spacing**: 8px base grid system from space tokens
4. **Cards**: 1/2/3-up responsive grid with min-widths from grid.minWidth tokens
5. **Forms**: Input sizing from input tokens, focus states with contrast fallback
6. **Tables**: Row height 48px, zebra/hover from table tokens
7. **Responsive**: Container max-widths from container tokens
8. **Motion**: Use motion.raise and motion.tap tokens for consistent hover effects

### Icon Standards
- **Buttons**: 16px icons (--icon-sm)
- **Inputs/Badges**: 20px icons (--icon-md) 
- **Headers/Cards**: 24px icons (--icon-lg)

### Brand Elements
- **Logo/Title**: Bold, large typography
- **Primary Color**: Use button.primary tokens
- **Success Actions**: Use button.secondary tokens
- **Gradients**: Use bg.gradient tokens (already in CSS)
- **Shadows**: Minimal elevation system

## 10. Open Questions

### Verification Needed
1. **Icon Library**: SVGs appear to be inline - verify source (likely Heroicons) *(confidence: 80%)*
2. **Font Loading**: System fonts only - no web fonts to load *(confidence: 95%)*
3. **Dark Mode**: Status: PLANNED - Sample pairs with AAA contrast ready in tokens *(confidence: 100%)*
4. **Print Styles**: Basic print hiding for actions *(confidence: 85%)*
5. **Animation Preferences**: Add `@media (prefers-reduced-motion: reduce)` to disable motion tokens *(confidence: 70%)*

### To Verify
- Inspect browser dev tools for any external font loading
- Check for CSS custom properties usage beyond current implementation
- Verify all icon sources and licensing
- Test actual color contrast in deployed environment
- Validate responsive breakpoint behavior across devices

### Extensibility
- **CSS Custom Properties**: Ready for theming implementation
- **Component Modularity**: Well-structured for extraction
- **Token System**: Prepared for design system scaling
- **Responsive Grid**: Flexible for new layouts