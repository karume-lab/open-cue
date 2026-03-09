/**
 * Global type augmentations for RNR (react-native-reuse) components.
 *
 * RNR components were designed for NativeWind which extends react-native types
 * with additional class-based props. This file bridges the gap so we get
 * correct TypeScript types without modifying the RNR component files.
 */
declare module "react-native" {
  interface TextInputProps {
    /**
     * A className for the placeholder text color.
     * Used by RNR components (originally a NativeWind prop).
     */
    placeholderClassName?: string;
  }
}

export {};
