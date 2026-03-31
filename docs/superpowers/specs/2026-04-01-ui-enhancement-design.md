# SereNova UI/UX Enhancement Design Specification

**Date:** 2026-04-01  
**Project:** SereNova AI Therapist  
**Version:** 1.0

---

## 1. Visual Style Direction

A calming, warm aesthetic blending:
- **Soft, soothing colors**: Sage greens, warm lavenders, cream whites
- **Modern touches**: Subtle glassmorphism on cards, gentle gradients
- **Warm & friendly**: Rounded corners (16-24px), soft shadows, approachable feel

## 2. Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Sage | `#6B8E7D` | Buttons, accents |
| Primary Dark | Deep Sage | `#4A6B5A` | Hover states |
| Secondary | Lavender | `#B8A9C9` | Highlights, tags |
| Background | Warm Cream | `#F7F5F2` | Page background |
| Surface | White | `#FFFFFF` | Cards, navbar |
| Text Primary | Dark Gray | `#2D3748` | Headings |
| Text Muted | Gray | `#718096` | Body text |
| Accent | Warm Beige | `#E8D5B7` | Subtle highlights |
| Border | Light Gray | `#E2E8F0` | Borders |

## 3. Typography

- **Headings**: 'DM Serif Display' — elegant, calming
- **Body**: 'Nunito' — friendly, readable, rounded

---

## 4. Landing Page Enhancements

### 4.1 Navbar
- Glassmorphism effect (backdrop-filter: blur(12px))
- Background: rgba(255, 255, 255, 0.85)
- Border-bottom: 1px solid rgba(255, 255, 255, 0.3)
- Sticky with box-shadow on scroll
- Logo: DM Serif Display, sage accent on "Nova"
- Responsive: hamburger menu on mobile (< 768px)

### 4.2 Hero Section
- Background: linear-gradient(160deg, #F7F5F2 0%, #FFFFFF 50%, #FAF9F7 100%)
- Floating decorative blobs (absolute positioned, opacity 0.08)
- Elements animate in with staggered fade-up:
  - Eyebrow: 0ms delay
  - Heading: 100ms delay
  - Subtitle: 200ms delay
  - CTA Button: 300ms delay
- "Start Talking" button: subtle pulse animation (box-shadow pulse)

### 4.3 Features Cards
- Background: #FFFFFF
- Border: 1px solid #E2E8F0
- Border-radius: 20px
- Shadow: 0 4px 24px rgba(107, 142, 125, 0.08)
- Hover: translateY(-6px), shadow expands
- Icon background: linear-gradient(135deg, #F7F5F2, #E8D5B7)
- Staggered scroll animation

### 4.4 How It Works
- Step cards: rounded, soft shadows
- Connector line: gradient from border to sage to border
- Step numbers: large, light opacity, sage color
- Section background: #FAF9F7

### 4.5 Footer
- Background: #FFFFFF
- Border-top: 1px solid #E2E8F0
- Minimal design
- Logo in DM Serif Display

---

## 5. Authentication Enhancements

### 5.1 Layout
- Centered card with glassmorphism
- Background: gradient from cream to white
- Card: backdrop-filter blur(20px), rgba(255, 255, 255, 0.9)
- Border-radius: 24px

### 5.2 Forms
- Input fields:
  - Border-radius: 12px
  - Border: 1px solid #E2E8F0
  - Focus: border-color #6B8E7D, box-shadow 0 0 0 3px rgba(107, 142, 125, 0.15)
- Floating labels with transition
- Validation states: warm red (#C53030) for errors

### 5.3 Buttons
- Border-radius: 12px (pill shape)
- Primary: sage background, white text
- Hover: deep sage, subtle lift
- Active: slight press effect

### 5.4 Transitions
- Smooth crossfade between login/signup views
- Form errors animate in

---

## 6. Animations Specification

### 6.1 Entrance Animations
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 6.2 Micro-interactions
- Button hover: transform translateY(-2px), shadow expand
- Card hover: transform translateY(-6px), shadow expand
- Input focus: border glow animation
- Link hover: color transition 0.2s

### 6.3 Timing
- Entrance delays: 0ms, 100ms, 200ms, 300ms (staggered)
- Transition duration: 0.3s ease-out
- Hover transitions: 0.2s ease

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Changes |
|------------|-------|---------|
| Mobile | < 640px | Single column, hamburger menu |
| Tablet | 640px - 1024px | Two columns where applicable |
| Desktop | > 1024px | Full layout |

---

## 8. "Start Talking" Button Action

The CTA button in the hero section should:
1. Check if user is logged in
2. If logged in → navigate to chat screen (show placeholder)
3. If not logged in → navigate to auth screen

For this implementation: Show a placeholder chat view when clicked.

---

## 9. Acceptance Criteria

- [ ] Color palette matches spec exactly
- [ ] Fonts load correctly (DM Serif Display, Nunito)
- [ ] Navbar has glassmorphism effect
- [ ] Hero elements animate on page load
- [ ] Feature cards have hover effects
- [ ] Auth has smooth transitions
- [ ] All buttons have hover/active states
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors
- [ ] Lint passes
