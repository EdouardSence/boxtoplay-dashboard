# Frontend Design

Build frontend interfaces that are distinctive, intentional, and production-ready. Every design choice should serve a purpose.

## Before You Code

### Establish a Design Direction

Don't start coding immediately. First, define the aesthetic intent:

1. **What feeling should this convey?** (professional trust, playful energy, technical precision, warm approachability)
2. **Who is the audience?** (developers, end users, enterprise buyers, creative professionals)
3. **What's the design personality?** (brutally minimal, maximalist, retro-futuristic, organic, editorial)

Commit to a direction. Half-committed design is worse than no design.

## Core Design Principles

### Typography

Typography carries 80% of a design's personality.

**Do:**
- Choose fonts that match the design intent — a fintech app and a creative portfolio need different type
- Use 2-3 font weights maximum for clear hierarchy
- Set line-height between 1.4–1.7 for body text
- Use `rem` or `em` for responsive sizing

**Don't:**
- Default to the same safe sans-serif on every project
- Use more than 2 font families
- Set body text below 16px
- Ignore letter-spacing on headings

### Color & Theme

Color creates emotional response before the user reads a single word.

**Do:**
- Build a cohesive palette with CSS custom properties
- Choose a dominant color and 1-2 sharp accents
- Test contrast ratios (WCAG AA minimum: 4.5:1 for text)
- Support dark mode from the start if appropriate

**Don't:**
- Use predictable gradient combinations that look like every other site
- Pick colors randomly — every color should be intentional
- Ignore how colors perform on different screens
- Use pure black (#000) for text — soften it slightly

### Layout & Spatial Composition

Layout is where generic designs are born or broken.

**Do:**
- Use CSS Grid and Flexbox purposefully — not just centered columns
- Create visual tension with asymmetry, overlap, and grid-breaking elements
- Design for the content, not for a template
- Use whitespace as a design element, not just padding

**Don't:**
- Default to symmetric, centered layouts for everything
- Use the same card grid that every other project uses
- Ignore mobile layout — design mobile-first
- Cram content into every available space

### Motion & Interaction

Animation should feel natural and reinforce the design language.

**Do:**
- Prioritize high-impact moments: page load, scroll reveals, state transitions
- Use `transform` and `opacity` for performant animations
- Keep durations between 200-500ms for UI transitions
- Match easing curves to the design personality (snappy vs. organic)

**Don't:**
- Animate everything — motion should be meaningful
- Use animation as decoration without purpose
- Block user interaction during animations
- Ignore `prefers-reduced-motion`

### Visual Details

Details separate polished work from prototypes.

**Do:**
- Add subtle textures, gradients, or patterns where they serve the design
- Use consistent border-radius, shadow, and spacing scales
- Design loading states, empty states, and error states
- Consider micro-interactions on buttons, inputs, and toggles

**Don't:**
- Use generic placeholder content in final designs
- Ignore hover, focus, and active states
- Ship without testing across viewports
- Forget about accessibility (keyboard navigation, screen readers, contrast)

## Anti-Patterns to Avoid

These patterns make interfaces look generic and AI-generated:

| Pattern | Problem | Alternative |
|---------|---------|-------------|
| Overused font stacks (Inter everywhere) | No personality | Choose fonts that match the project's identity |
| Purple/blue gradient hero sections | Instantly recognizable as template | Use colors that serve the brand, not the trend |
| Identical card grids | Every page looks the same | Vary layout based on content hierarchy |
| Generic stock illustrations | Feels impersonal | Use contextual visuals or strong typography instead |
| Cookie-cutter component libraries with no customization | No design ownership | Customize components to match the design system |
| Centered single-column everything | Safe but boring | Use the full viewport with intentional composition |

## Implementation Approach

### Match Complexity to Vision

- **Maximalist design** → elaborate effects, layered compositions, rich interactions
- **Minimalist design** → precision in spacing, typography, and micro-details
- **Editorial design** → strong type hierarchy, generous whitespace, content-driven layout

### Technology Choices

- Use vanilla CSS/HTML when the design is simple
- Use a framework (React, Vue, Svelte) when interactivity demands it
- Use CSS custom properties for theming — avoid hardcoded values
- Inline critical CSS for above-the-fold content
- Optimize images and fonts for performance

### Responsive Strategy

1. Design mobile-first
2. Use fluid typography (`clamp()`)
3. Test at real device widths, not just breakpoints
4. Ensure touch targets are at least 44x44px

## Checklist Before Shipping

- [ ] Design direction is clear and consistent throughout
- [ ] Typography hierarchy is established (h1 → body → caption)
- [ ] Color palette is cohesive and accessible (WCAG AA)
- [ ] Layout works across mobile, tablet, and desktop
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Interactive elements have hover, focus, and active states
- [ ] Loading, empty, and error states are designed
- [ ] Performance is acceptable (LCP < 2.5s, CLS < 0.1)
- [ ] The result does NOT look like a generic template
