/**
 * Motion tokens and variant configurations for Cloudora LMS.
 * Complies with Section 4 and Section 5 of the Landing Page specification.
 */

export const MOTION_TOKENS = {
  durations: {
    fast: 220,
    normal: 450,
    slow: 700,
    staggerDelay: 60,
    wordStagger: 40,
    countUp: 1200,
  },
  easings: {
    easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOutSine: 'cubic-bezier(0.37, 0, 0.63, 1)',
    springGentle: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  distances: {
    sm: 12,
    md: 20,
    lg: 32,
  },
  variants: {
    words: {
      duration: 450,
      stagger: 35,
      yOffset: 16,
    },
    sentences: {
      duration: 550,
      stagger: 60,
      yOffset: 18,
    },
    cards: {
      duration: 500,
      stagger: 75,
      scaleStart: 0.97,
      yOffset: 20,
    },
    wrapper: {
      duration: 650,
      yOffset: 24,
    },
    image: {
      duration: 600,
      scaleStart: 0.96,
      yOffset: 16,
    },
    list: {
      duration: 400,
      stagger: 80,
      yOffset: 14,
    },
    stats: {
      duration: 1100,
    },
    divider: {
      duration: 350,
      scaleStart: 0.95,
    },
    cta: {
      duration: 450,
      yOffset: 14,
    },
    alternatingLeft: {
      duration: 550,
      xOffset: -28,
    },
    alternatingRight: {
      duration: 550,
      xOffset: 28,
    },
  },
};

export type RevealVariant = keyof typeof MOTION_TOKENS.variants;
