import { Platform, Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NativeOnlyAnimatedViewProps {
  as?: "View" | "Pressable";
  children?: React.ReactNode;
  entering?: React.ComponentProps<typeof Animated.View>["entering"];
  exiting?: React.ComponentProps<typeof Animated.View>["exiting"];
  className?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessible?: boolean;
}

/**
 * Wraps children in an Animated.View on native platforms so entering/exiting
 * animations play, while rendering children directly on web (where animation
 * is handled by CSS classes instead). className/style/onPress are forwarded to
 * the underlying native component on native so callers can style it.
 */
function NativeOnlyAnimatedView({
  as = "View",
  children,
  entering,
  exiting,
  className,
  style,
  onPress,
  accessible,
}: NativeOnlyAnimatedViewProps) {
  if (Platform.OS === "web") {
    return <>{children as React.ReactNode}</>;
  }
  if (as === "Pressable") {
    return (
      <AnimatedPressable
        entering={entering}
        exiting={exiting}
        className={className}
        style={style}
        onPress={onPress}
        accessible={accessible}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      className={className}
      style={style}
      accessible={accessible}
    >
      {children}
    </Animated.View>
  );
}

export { NativeOnlyAnimatedView };
