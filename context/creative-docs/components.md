# Component Blueprint Library

## Button Components

### Primary Button (.generate-btn, .action-btn)

**HTML Structure:**
```html
<button class="generate-btn">
  <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
  </svg>
  Get Report
</button>
```

**Measurements:**
| Property | Value | Token |
|----------|-------|-------|
| Padding | 16px 32px | var(--button-lg-padding) |
| Border Radius | 12px | var(--radii-md) |
| Font Size | 16px | var(--text-body-md-size) |
| Font Weight | 600 | var(--text-title-md-weight) |
| Min Width | 140px | Component-specific |
| Height | 48px | var(--button-lg-height) |
| Gap | 8px | var(--space-2) |

**States:**
- **Default**: Background var(--button-primary-bg), color var(--button-primary-fg)
- **Hover**: Background var(--button-primary-hover-bg), transform var(--motion-tap-transform)
- **Disabled**: opacity var(--button-primary-disabled-opacity), cursor not-allowed
- **Focus**: Box-shadow var(--focus-ring) or var(--focus-ring-contrast) in high contrast mode

### Secondary Button (.action-btn variants)

**HTML Structure:**
```html
<button class="action-btn gray">
  <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
  </svg>
  Back to Report
</button>
```

**Measurements:**
| Property | Value | Token |
|----------|-------|-------|
| Padding | 12px 24px | var(--button-md-padding) |
| Border Radius | 8px | var(--radii-sm) |
| Font Size | 14px | var(--text-body-sm-size) |
| Font Weight | 500 | var(--text-body-xs-weight) |
| Icon Size | 16px | var(--icon-sm) |

**Semantic Variants:**
- **Primary**: var(--button-primary-bg/fg/hover-bg)
- **Secondary**: var(--button-secondary-bg/fg/hover-bg)
- **Gray**: var(--button-gray-bg/fg/hover-bg)
- **Ghost**: var(--button-ghost-bg/fg/hover-bg/hover-fg)
- **LinkedIn**: var(--button-linkedin-bg/fg/hover-bg)

### Icon Button (.copy-contact-btn, .table-copy-btn)

**HTML Structure:**
```html
<button class="copy-contact-btn" title="Copy contact info">
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
  </svg>
</button>
```

**Measurements:**
| Property | Value | Token |
|----------|-------|-------|
| Size | 28px × 28px | Component-specific |
| Padding | 6px | Calculated from size - icon |
| Border Radius | 8px | var(--radii-sm) |
| Icon Size | 16px | var(--icon-sm) |

## Input Components

### Text Input (.url-input, .search-input)

**HTML Structure:**
```html
<input
  type="text"
  id="urlInput"
  placeholder="Enter company website URL"
  class="url-input"
/>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Padding | 16px (main), 12px (secondary) | Comfortable touch targets |
| Border | 2px solid #e2e8f0 | Prominent border |
| Border Radius | 12px (main), 8px (secondary) | Rounded appearance |
| Font Size | 16px (main), 14px (secondary) | Readable text |
| Transition | border-color 0.2s | Smooth focus |

**States:**
- **Default**: Border #e2e8f0
- **Focus**: Border #CF0E0F, box-shadow 0 0 0 3px rgba(207, 14, 15, 0.1)
- **Disabled**: Background #f1f5f9, color #64748b, cursor not-allowed

### Select Dropdown (.filter-select)

**HTML Structure:**
```html
<select id="categoryFilter" class="filter-select">
  <option value="">All Categories</option>
  <option value="decision-makers">Decision Makers (5)</option>
</select>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Padding | 12px 16px | Balanced spacing |
| Border | 2px solid #e2e8f0 | Consistent with inputs |
| Border Radius | 8px | Moderate rounding |
| Background | white | Solid background |
| Font Size | 14px | Compact text |

## Card Components

### Report Container (.report-container)

**HTML Structure:**
```html
<div class="report-container">
  <div class="report-header">
    <h1 class="report-title">Company Research Report</h1>
    <p class="report-subtitle">Comprehensive analysis and insights</p>
  </div>
  <div class="report-section">
    <!-- Content -->
  </div>
</div>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Background | white | Clean surface |
| Border | 1px solid #e2e8f0 | Subtle definition |
| Border Radius | 16px | Large, friendly corners |
| Box Shadow | 0 4px 6px -1px rgba(0, 0, 0, 0.1) | Subtle elevation |
| Overflow | hidden | Clean edge handling |

### Contact Card (.contact-card)

**HTML Structure:**
```html
<div class="contact-card">
  <div class="contact-header">
    <div class="contact-info">
      <h3 class="contact-name">John Smith</h3>
      <p class="contact-title">Chief Technology Officer</p>
      <div class="contact-badges">
        <span class="badge badge-level">C-LEVEL</span>
      </div>
    </div>
    <button class="copy-contact-btn"><!-- icon --></button>
  </div>
  <div class="contact-details"><!-- contact info --></div>
  <div class="contact-actions"><!-- action buttons --></div>
</div>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Padding | 24px | Generous internal spacing |
| Border | 2px solid #e2e8f0 | Prominent border |
| Border Radius | 16px | Large rounded corners |
| Transition | all 0.2s | Smooth interactions |

**States:**
- **Default**: Border #e2e8f0
- **Hover**: transform translateY(-2px), box-shadow lg, border #CF0E0F

### Decision Maker Card (.decision-maker-card)

**HTML Structure:**
```html
<div class="decision-maker-card">
  <div class="decision-maker-header">
    <div>
      <div class="decision-maker-name">Sarah Johnson</div>
      <div class="decision-maker-title">VP of Operations</div>
    </div>
    <span class="decision-maker-level">VP</span>
  </div>
  <div class="decision-maker-actions"><!-- buttons --></div>
</div>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Padding | 24px | Consistent with contact cards |
| Background | #f8fafc | Subtle background tint |
| Border | 1px solid #e2e8f0 | Lighter border |
| Border Radius | 12px | Medium rounding |

## Table Components

### Data Table (.table, .contacts-table)

**HTML Structure:**
```html
<div class="table-container">
  <table class="table table-standard table-zebra">
    <thead>
      <tr>
        <th>Contact</th>
        <th>Email</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="table-contact-name">John Smith</td>
        <td class="table-contact-info">john@company.com</td>
        <td class="table-actions"><!-- buttons --></td>
      </tr>
    </tbody>
  </table>
</div>
```

**Measurements:**
| Property | Value | Token |
|----------|-------|-------|
| Row Height | 48px | var(--table-row-height) |
| Header Background | #f8fafc | var(--table-header-bg) |
| Header Padding | 16px | var(--table-row-padding) |
| Cell Padding | 16px | var(--table-row-padding) |
| Hover Background | #f8fafc | var(--table-hover-bg) |
| Zebra Odd | #ffffff | var(--table-zebra-odd) |
| Zebra Even | #f8fafc | var(--table-zebra-even) |

**States:**
- **Row Hover**: Background var(--table-hover-bg)
- **Zebra Striping**: Applied with .table-zebra class

## Navigation Components

### View Toggle (.view-toggle)

**HTML Structure:**
```html
<div class="view-toggle">
  <button class="view-toggle-btn active">
    <svg width="16" height="16"><!-- icon --></svg>
    Cards
  </button>
  <button class="view-toggle-btn">
    <svg width="16" height="16"><!-- icon --></svg>
    Table
  </button>
</div>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Container Background | #f1f5f9 | Light background |
| Container Padding | 4px | Minimal internal padding |
| Container Border Radius | 8px | Rounded container |
| Button Padding | 8px 16px | Balanced button spacing |
| Button Border Radius | 6px | Nested rounding |
| Gap | 8px | Icon-text spacing |

**States:**
- **Active**: Background white, color #CF0E0F, box-shadow
- **Inactive**: Color #64748b
- **Hover (inactive)**: Color #374151

## Progress Components

### Progress Bar (.progress-bar-bg, .progress-bar-fill)

**HTML Structure:**
```html
<div class="progress-container">
  <div class="progress-info">
    <span id="progressMessage">Analyzing website...</span>
    <span id="progressPercent">45%</span>
  </div>
  <div class="progress-bar-bg">
    <div class="progress-bar-fill" style="width: 45%;"></div>
  </div>
</div>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Container Height | 8px | Thin progress bar |
| Background | #e2e8f0 | Light gray background |
| Fill Background | #CF0E0F | Brand color |
| Border Radius | 4px | Subtle rounding |
| Transition | width 0.3s ease | Smooth progress |

## Badge Components

### Status Badge (.badge, .status-badge)

**HTML Structure:**
```html
<span class="badge badge-level">C-LEVEL</span>
<span class="badge badge-salary">$150K-200K</span>
<span class="status-badge status-completed">Completed</span>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Padding | 4px 12px | Compact spacing |
| Border Radius | 9999px | Fully rounded pills |
| Font Size | 12px | Small text |
| Font Weight | 500 | Medium weight |
| Text Transform | uppercase | Consistent formatting |

**Variants:**
- **Level**: Background #dbeafe, color #1d4ed8
- **Salary**: Background #d1fae5, color #065f46
- **Category**: Background #fef3c7, color #92400e
- **Success**: Background #dcfce7, color #166534
- **Error**: Background #fee2e2, color #dc2626

## Modal Components

### Modal Dialog (.modal, .modal-content)

**HTML Structure:**
```html
<div class="modal">
  <div class="modal-content">
    <button class="modal-close">×</button>
    <div class="modal-header">
      <h3 class="modal-title">Select Email</h3>
      <p>Choose which email to contact:</p>
    </div>
    <div class="modal-body"><!-- content --></div>
  </div>
</div>
```

**Measurements:**
| Property | Value | Notes |
|----------|-------|-------|
| Overlay Background | rgba(0, 0, 0, 0.5) | Semi-transparent black |
| Content Padding | 32px | Generous spacing |
| Content Border Radius | 16px | Large friendly corners |
| Content Max Width | 400px | Constrained width |
| Content Width | 90% | Responsive on mobile |
| Close Button Size | 32px × 32px | Touch-friendly target |

## Accessibility Notes

### Focus States
- **Default Ring**: var(--focus-ring) = rgba(207, 14, 15, 0.1)
- **High Contrast**: var(--focus-ring-contrast) = 2px solid #1e293b
- **Media Query**: `@media (prefers-contrast: more)` switches to high contrast ring
- **Coverage**: All interactive elements

### Core Layout Requirements
```html
<!-- Required landmark structure -->
<a class="sr-only focusable" href="#content">Skip to content</a>
<header role="banner">...</header>
<nav aria-label="Main navigation">...</nav>
<main id="content" role="main">...</main>
<footer role="contentinfo">...</footer>
```

### Keyboard Navigation
- **Tab Order**: Logical sequence through interactive elements
- **Skip Links**: Required sr-only focusable pattern (z-index: 2000)
- **Modal Trapping**: Basic focus management in modals
- **Button States**: Clear disabled and active states with semantic tokens

### Screen Reader Support
- **Labels**: Form inputs have associated labels
- **Headings**: Proper h1-h3 hierarchy
- **ARIA Landmarks**: header, nav, main, footer roles required
- **Title Attributes**: Tooltips on icon buttons

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-raise-transform: none;
    --motion-tap-transform: none;
    --duration-normal: 0ms;
  }
}
```