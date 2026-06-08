// Design tokens — single source of truth for Elevate's visual scale.
// Prefer these over hardcoded literals in new/edited components.

export const radius = {
  sm: 12, // chips, badges, small buttons, steppers
  md: 16, // cards, inputs, primary buttons
  lg: 24, // hero cards, bottom sheets
  pill: 999,
  circle: '50%',
} as const

// Warm cream/blush palette (mirrors src/index.css @theme tokens).
export const colors = {
  cream: '#FAF7F2',
  creamDark: '#F0EAE0',
  blush: '#F2C4B0',
  blushDark: '#E8A88E',
  taupe: '#C4A882',
  taupeLight: '#E8D8C4',
  warmDark: '#3A2E28',
  warmMid: '#7A6458',
  sage: '#B8C4B0',
  sageLight: '#D8E4D0',
  white: '#FFFFFF',
  red: '#C0504D',
} as const

// z-index scale — one formal stacking order so sheets/toasts/dialogs don't collide.
export const z = {
  nav: 50,
  sheetBackdrop: 100,
  sheet: 101,
  toast: 150,
  fullscreen: 200, // ActiveWorkout
  dialog: 300, // confirm dialogs / update banner above everything
} as const

// Motion presets — one source for the app's animation feel.
export const anim = {
  tap: { type: 'spring' as const, stiffness: 400, damping: 28 },
  sheet: { type: 'spring' as const, stiffness: 300, damping: 32 },
  enter: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
}

export const font = {
  display: '"Cormorant Garamond", Georgia, serif',
  body: '"DM Sans", system-ui, sans-serif',
} as const
