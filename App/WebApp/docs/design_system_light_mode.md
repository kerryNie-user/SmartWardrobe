# Light Mode Design System Specification (v1.0)

## 1. Design Philosophy
- **Minimalist Black & White:** High-contrast, clean, and modern. Inspired by luxury fashion brands and Apple's Human Interface Guidelines.
- **Focus on Content:** Visual noise is minimized to let the wardrobe items shine.
- **Precision:** 8pt grid system for layout, refined typography hierarchy.

## 2. Color Palette (WCAG 2.1 AA Compliant)

### Primary Colors
- **Primary Action (Brand Black):** `#000000` (Use for Buttons, Active States, Key Info)
- **Primary Text:** `#111827` (Near Black, softer on eyes than pure black)
- **Background (Pure White):** `#FFFFFF` (Main surface)

### Secondary & Neutral Colors
- **Secondary Background:** `#F3F4F6` (Light Gray 100 - Cards, Hovers)
- **Tertiary Background:** `#F9FAFB` (Light Gray 50 - Subtle sections)
- **Border:** `#E5E7EB` (Gray 200 - Dividers, Inputs)
- **Secondary Text:** `#6B7280` (Gray 500 - Metadata, Placeholders)
- **Disabled:** `#9CA3AF` (Gray 400 - Inactive elements)

### Status Colors
- **Success:** `#10B981` (Green 500)
- **Warning:** `#F59E0B` (Amber 500)
- **Error:** `#EF4444` (Red 500)
- **Info:** `#3B82F6` (Blue 500)

## 3. Typography (Inter / System Font Stack)

| Level | Size (px/rem) | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | 28px / 1.75rem | Bold (700) | 1.2 | Page Titles |
| **H2** | 24px / 1.5rem | Bold (700) | 1.25 | Section Headers |
| **H3** | 20px / 1.25rem | SemiBold (600) | 1.3 | Card Titles |
| **Body Large** | 16px / 1rem | Regular (400) | 1.5 | Main Content |
| **Body Medium** | 14px / 0.875rem | Regular (400) | 1.5 | Secondary Info |
| **Caption** | 12px / 0.75rem | Medium (500) | 1.4 | Labels, Metadata |
| **Tiny** | 10px / 0.625rem | Bold (700) | 1.2 | Badges |

## 4. Spacing System (8pt Grid)

| Name | Size | Usage |
| :--- | :--- | :--- |
| **XS** | 4px | Tight grouping |
| **SM** | 8px | Related elements |
| **MD** | 16px | Components spacing |
| **LG** | 24px | Section padding |
| **XL** | 32px | Major separation |
| **2XL** | 48px | Page margins |

## 5. Component Styles

### Buttons (Primary)
- **Background:** `#000000`
- **Text:** `#FFFFFF`
- **Border Radius:** `12px` or `50%` (Icon Buttons)
- **Padding:** `12px 24px` (Height: 48px)
- **Shadow:** `0 4px 6px -1px rgba(0, 0, 0, 0.1)`

### Cards
- **Background:** `#FFFFFF`
- **Border Radius:** `16px`
- **Shadow:** `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`
- **Hover:** Transform Y -2px, Shadow LG

### Inputs
- **Background:** `#F9FAFB`
- **Border:** `1px solid #E5E7EB`
- **Border Radius:** `12px`
- **Height:** `48px`
- **Focus:** Border `#000000`, Ring `2px rgba(0,0,0,0.1)`

## 6. Interaction States

| State | Visual Change |
| :--- | :--- |
| **Hover** | Background brightness 95%, subtle scale (1.02), Shadow increase |
| **Active** | Scale (0.98), Background brightness 90% |
| **Focus** | Outline: 2px solid Primary (or Ring style) |
| **Disabled** | Opacity 0.5, Pointer events none |

## 7. Animation
- **Timing Function:** `cubic-bezier(0.4, 0, 0.2, 1)` (Standard Ease)
- **Durations:**
  - Fast: `150ms` (Hover, Color changes)
  - Medium: `300ms` (Modals, Panels)
  - Slow: `500ms` (Page transitions)
