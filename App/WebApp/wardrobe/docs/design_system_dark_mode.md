# Dark Mode Button Design System Specification

## Overview
This document outlines the standardized visual style for all buttons in Dark Mode. The goal is to unify the UI with a high-contrast, minimalist "Black & White" aesthetic, removing large white block elements in favor of outlined or black-filled components with white borders.

## Core Visual Style (Dark Mode)

| Property | Value | Description |
| :--- | :--- | :--- |
| **Background Color** | `#000000` (Pure Black) | Replaces previous white/gray fills. |
| **Border** | `1px solid #FFFFFF` | High-contrast white border for visibility. |
| **Text / Icon Color** | `#FFFFFF` (Pure White) | Ensures maximum readability. |
| **Shadow** | `0 4px 12px rgba(0,0,0,0.5)` | Deep shadow for depth. |
| **Corner Radius** | `50%` (Circle) or `16px` (Rounded) | Matches component type (FAB vs Button). |

## Component Specifications

### 1. Primary Button (`.btn-primary`)
Standard action button (e.g., "Login", "Save").
- **Normal State**:
  - Background: `#000000`
  - Border: `1px solid #FFFFFF`
  - Text: `#FFFFFF`
- **Hover State**:
  - Background: `#1a1a1a`
  - Scale: `1.02`
  - Box Shadow: `0 0 15px rgba(255, 255, 255, 0.1)`
- **Active State**:
  - Scale: `0.96`
  - Background: `#000000`

### 2. Floating Action Button (`.fab`)
Main floating action (e.g., "Add Item").
- **Normal State**:
  - Background: `#000000`
  - Border: `1px solid #FFFFFF`
  - Icon: `#FFFFFF`
  - Size: `56px × 56px`
- **Interaction**: Same as Primary Button.

### 3. Navigation / Back Button (`.detail-back-btn`)
Circular navigation control.
- **Normal State**:
  - Background: `#000000`
  - Border: `1px solid rgba(255, 255, 255, 0.3)` -> `1px solid #FFFFFF` on hover.
  - Icon: `#FFFFFF`
  - Size: `48px × 48px`

### 4. Tag / Filter Pills (`.filter-tag.active`)
Active state for filter tags.
- **Normal State**:
  - Background: `#000000`
  - Border: `1px solid #FFFFFF`
  - Text: `#FFFFFF`

### 5. Secondary Button (`.btn-secondary`, `.btn-cancel`)
Less prominent actions.
- **Normal State**:
  - Background: `transparent`
  - Border: `1px solid rgba(255, 255, 255, 0.4)`
  - Text: `#FFFFFF`
- **Hover State**:
  - Border: `1px solid #FFFFFF`
  - Background: `rgba(255, 255, 255, 0.05)`

## Implementation Guide

Apply the following CSS overrides in your stylesheet under `[data-theme="dark"]`:

```css
[data-theme="dark"] .btn-primary,
[data-theme="dark"] .fab,
[data-theme="dark"] .search-btn,
[data-theme="dark"] .detail-back-btn,
[data-theme="dark"] .btn-save,
[data-theme="dark"] .filter-tag.active {
    background-color: #000000 !important;
    color: #ffffff !important;
    border: 1px solid #ffffff !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
```

This ensures a consistent look across the application.
