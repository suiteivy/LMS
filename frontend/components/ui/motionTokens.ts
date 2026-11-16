/**
 * Central motion design tokens and variant configurations for Cloudora LMS.
 * Complies with Section 1 (Reveal system) and Section 2 (Aura Demo Button)
 * of the Landing Page Fixes specification.
 *
 * All animation timing, distances, and easings live here.
 * No per-element magic numbers!
 */

export const MOTION_TOKENS = {
  // Base reveal durations and staggers (unhurried, elegant, noticeable)
  durations: {
    revealBase: 900,         // 800 - 1000 ms base reveal
    headlineMask: 1000,      // 900 - 1100 ms headline line / mask reveal
    wordStagger: 80,         // 70 - 100 ms per word
    cardStagger: 140,        // 120 - 180 ms between cards/items
    sectionSequenceDelay: 180,// 150 - 250 ms sequence step inside section
    countUp: 1400,           // Stats counter duration
    hoverTransition: 240,    // 200 - 300 ms smooth hover states
  },

  // Central easing curves
  easings: {
    // Primary smooth ease-out specified in Section 1.3
    smoothEaseOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    // Subtle snappy ease for button hover / clicks
    snappyEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
    // Breathing sine curve for ambient aura oscillations
    auraBreathe: 'cubic-bezier(0.37, 0, 0.63, 1)',
    // Linear for continuous gradient ring rotation
    linear: 'linear',
  },

  // Standard movement distances
  distances: {
    riseSm: 20,              // Minor elements, pills
    riseMd: 32,              // Standard paragraph and card rise (28 - 40 px)
    riseLg: 40,              // Major headings and hero elements
    sideSlide: 48,           // Alternating cards slide-in (40 - 60 px)
    magneticPullMax: 6,      // Maximum magnetic cursor pull (px)
    buttonLift: -2,          // Hover lift (px)
    iconNudge: 3,            // Shimmer sync arrow nudge (px)
  },

  // Reveal Variant Configurations
  variants: {
    headline: {
      duration: 1000,
      yOffset: 36,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    words: {
      duration: 900,
      stagger: 80,
      yOffset: 24,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    sentences: {
      duration: 900,
      stagger: 100,
      yOffset: 28,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    cards: {
      duration: 900,
      stagger: 140,
      scaleStart: 0.96,
      yOffset: 32,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    wrapper: {
      duration: 850,
      yOffset: 28,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    image: {
      duration: 950,
      scaleStart: 0.95,
      yOffset: 28,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    list: {
      duration: 800,
      stagger: 120,
      yOffset: 20,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    stats: {
      duration: 1400,
      yOffset: 24,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    cta: {
      duration: 850,
      yOffset: 24,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    alternatingLeft: {
      duration: 900,
      xOffset: -48,
      yOffset: 0,
      scaleStart: 0.97,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    alternatingRight: {
      duration: 900,
      xOffset: 48,
      yOffset: 0,
      scaleStart: 0.97,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },

  // "Try Interactive Demo" Premium Aura Button Tokens (Section 2)
  demoButton: {
    // 1. Rotating gradient ring (6 - 8s per turn)
    ring: {
      duration: 7000,          // 7s linear per turn
      hoverDuration: 3500,     // 3.5s when hovered
      borderWidth: 1.8,        // 1.5 - 2px thin gradient ring
      colors: ['#FF6B00', '#FFA066', '#EC4899', '#FF8C40', '#FF6B00'],
    },
    // 2. Breathing outer glow (3 - 3.5s, no size change)
    glow: {
      period: 3200,            // 3.2s breathing cycle
      minOpacity: 0.32,
      maxOpacity: 0.78,
      minSpread: 8,
      maxSpread: 22,
      color: 'rgba(255, 107, 0, 0.45)',
      maxScale: 1.008,         // Button scale capped <= 1.01
    },
    // 3. Shimmer sweep (once every 4 - 5s, ~1s sweep, then rest)
    shimmer: {
      interval: 4600,          // 4.6s full cycle
      sweepDuration: 1000,     // 1.0s active streak across button
      restDuration: 3600,      // 3.6s rest phase
      angle: '-22deg',
      color: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.42) 50%, transparent 100%)',
    },
    // 4. Icon micro-motion (sync with shimmer)
    iconNudge: {
      distance: 3.5,           // 3.5 px nudge
      duration: 1000,
    },
    // 5. Desktop hover / focus magnetic pull
    magnetic: {
      maxPull: 6,              // Max 6 px pull
      factor: 0.16,
      springTransition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
    },
    // 6. Press action
    press: {
      scale: 0.98,
      duration: 100,
    },
  },
};

export type RevealVariant = keyof typeof MOTION_TOKENS.variants;
