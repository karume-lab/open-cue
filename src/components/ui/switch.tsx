import * as React from 'react';
import { Platform } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  SwitchPrimitives.RootRef,
  SwitchPrimitives.RootProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer flex-row h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors shadow-sm shadow-black/5',
      props.disabled && 'opacity-50',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'h-5 w-5 rounded-full bg-background shadow-md shadow-black/10'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

/**
 * Animated version of the Switch using Reanimated for the track color.
 * This adheres more closely to the "premium" feel requested.
 */
const AnimatedSwitch = React.forwardRef<
  SwitchPrimitives.RootRef,
  SwitchPrimitives.RootProps
>(({ className, ...props }, ref) => {
  // Use a shared value so Reanimated worklets can track changes correctly
  const isChecked = useSharedValue(props.checked ? 1 : 0);

  React.useEffect(() => {
    isChecked.value = withTiming(props.checked ? 1 : 0, { duration: 200 });
  }, [props.checked, isChecked]);

  const animatedRootStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      isChecked.value,
      [0, 1],
      ['#3f1f4a', '#b23e9e'],
    ),
  }));

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: isChecked.value * 20 }],
  }));

  return (
    <SwitchPrimitives.Root
      className={cn(
        'group flex-row h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}
      ref={ref}
    >
      <Animated.View
        className="absolute inset-0 rounded-full"
        style={animatedRootStyle}
      />
      <SwitchPrimitives.Thumb asChild>
        <Animated.View
          className="h-4 w-4 rounded-full bg-background shadow-sm m-0.5"
          style={animatedThumbStyle}
        />
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
});


export { AnimatedSwitch as Switch };
