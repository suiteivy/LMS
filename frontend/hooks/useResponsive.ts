import { useWindowDimensions, Platform } from "react-native";

export interface ResponsiveTokens {
  width: number;
  height: number;
  isSmallPhone: boolean;  // < 380px (iPhone SE, Galaxy Z Flip cover, 320px-375px)
  isMobile: boolean;      // < 768px (Standard phones)
  isTablet: boolean;      // 768px - 1023px (iPad Portrait/Landscape, Android tablets)
  isDesktop: boolean;     // >= 1024px (Laptops, Desktops)
  isLargeDesktop: boolean;// >= 1440px (Wide monitors)
  useWebLayout: boolean;  // >= 768px (Two-column sidebar for Web & Native Tablet)
  orientation: "portrait" | "landscape";
  prefersReducedMotion: boolean;
}

/**
 * Standardized responsive tokens and breakpoints across Cloudora LMS.
 * Replaces scattered media queries and static Dimensions.get('window') calls.
 */
export function useResponsive(): ResponsiveTokens {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 380;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1440;
  const useWebLayout = width >= 768;
  const orientation = width > height ? "landscape" : "portrait";

  const prefersReducedMotion =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    width,
    height,
    isSmallPhone,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    useWebLayout,
    orientation,
    prefersReducedMotion: !!prefersReducedMotion,
  };
}
