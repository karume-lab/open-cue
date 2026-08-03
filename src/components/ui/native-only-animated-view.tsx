import { Platform, Pressable } from "react-native";
import Animated from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NativeOnlyAnimatedViewProps {
  as?: "View" | "Pressable";
  children?: React.ReactNode;
  entering?: React.ComponentProps<typeof Animated.View>["entering"];
  exiting?: React.ComponentProps<typeof Animated.View>["exiting"];
}

/**
 * Wraps children in an Animated.View on native platforms so entering/exiting
 * animations play, while rendering children directly on web (where animation
 * is handled by CSS classes instead).
 */
function NativeOnlyAnimatedView(props: NativeOnlyAnimatedViewProps) {
  if (Platform.OS === "web") {
    return <>{props.children as React.ReactNode}</>;
  }
  if (props.as === "Pressable") {
    return (
      <AnimatedPressable entering={props.entering} exiting={props.exiting}>
        {props.children}
      </AnimatedPressable>
    );
  }
  return (
    <Animated.View entering={props.entering} exiting={props.exiting}>
      {props.children}
    </Animated.View>
  );
}

export { NativeOnlyAnimatedView };
