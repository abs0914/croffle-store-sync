
# Design Lock Documentation

This document serves as the official design reference for our application. Any UI changes must be compared against this documentation and require explicit approval before implementation.

## Design Philosophy

Our application uses a warm, inviting color scheme based on croffle (croissant-waffle) colors that convey a sense of comfort and luxury. The design is clean, with rounded corners, subtle gradients, and clear visual hierarchy.

## Color Palette

- Primary: `#8B5F3C` - Rich brown, used for primary text and UI elements
- Accent: `#F37A1F` - Warm orange, used for highlights and call-to-action elements
- Background: `#F8EBD8` - Soft cream, used for page backgrounds
- Light: `#FDE1D3` - Pale peach, used for secondary backgrounds and hover states
- Dark: `#6D4B2F` - Deep brown, used for shadows and borders
- Text: `#4A3520` - Dark brown, used for body text

## Locked Components

### Sidebar

The sidebar follows these specific design guidelines:

1. **Logo Area**
   - Centered logo at the top with "The Croffle Store" branding
   - App name "PVOSyncPOS" displayed below the logo in primary color
   - Gradient background from `croffle-background` to `croffle-light`

2. **Start Shift Button**
   - Prominent button in the accent color (#F37A1F)
   - Full width with white text
   - Rounded corners (8px radius)

3. **Menu Items**
   - Text color: Dark brown (#4A3520)
   - Rounded corners (8px radius)
   - Clear spacing between items (8px)
   - Icon aligned left, with consistent sizing
   - Active state: accent color background with white text
   - Hover state: lighter accent color background with white text
   - Height of 44px for primary menu items

4. **User Profile Section**
   - Gradient background matching header
   - Avatar with accent color border
   - Username in primary text color
   - Store name in muted text color

## Design Modification Process

1. Create a visual mockup of proposed changes
2. Get explicit approval from the design owner
3. Document approved changes in this file
4. Update the design tokens in `src/utils/designSystem.ts`
5. Implement the approved changes

## Version History

| Version | Date | Description | Approved By |
|---------|------|-------------|------------|
| 1.0 | 2025-05-08 | Initial design lock documentation | Team Lead |
| 1.1 | 2025-05-08 | Updated sidebar design to match original branding | Team Lead |

