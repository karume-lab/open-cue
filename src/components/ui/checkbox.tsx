import { Check } from 'lucide-react-native';
import * as React from 'react';
import { Platform } from 'react-native';
import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

const Checkbox = React.forwardRef<
  CheckboxPrimitive.RootRef,
  CheckboxPrimitive.RootProps
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer flex-row h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background disabled:cursor-not-allowed disabled:opacity-50',
      props.checked && 'bg-primary border-primary',
      Platform.select({
        web: 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring cursor-pointer focus-visible:outline-1 focus-visible:ring-[3px]',
      }),
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('items-center justify-center')}>
      <Icon as={Check} size={14} className="text-primary-foreground" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
