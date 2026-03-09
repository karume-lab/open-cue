import * as React from 'react';
import { Platform } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
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
  const [checked, setChecked] = React.useState(props.checked ?? false);

  React.useEffect(() => {
    if (props.checked !== undefined) {
      setChecked(props.checked);
    }
  }, [props.checked]);

  const progress = useDerivedValue(() => {
    return withTiming(checked ? 1 : 0, { duration: 200 });
  });

  const animatedRootStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['#e4e4e7', '#09090b'] // muted to primary (fallback colors, will use classes below)
      ),
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withTiming(checked ? 20 : 0, { duration: 200 }),
        },
      ],
    };
  });

  return (
    <SwitchPrimitives.Root
      className={cn(
        'group flex-row h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}
      onCheckedChange={(val) => {
        setChecked(val);
        props.onCheckedChange?.(val);
      }}
      ref={ref}
    >
      <Animated.View
         className={cn(
           "absolute inset-0 rounded-full",
           checked ? "bg-primary" : "bg-muted"
         )}
      />
      <SwitchPrimitives.Thumb asChild>
        <Animated.View
          className={cn(
            'h-5 w-5 rounded-full bg-background shadow-sm'
          )}
          style={animatedThumbStyle}
        />
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
});

export { AnimatedSwitch as Switch };
