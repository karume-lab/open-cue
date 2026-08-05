import type React from 'react';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';

const Tabs: React.FC<
  TabsPrimitive.RootProps & React.RefAttributes<TabsPrimitive.RootRef>
> = ({ className, ...props }) => {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
};

const TabsList: React.FC<
  TabsPrimitive.ListProps & React.RefAttributes<TabsPrimitive.ListRef>
> = ({ className, ...props }) => {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-muted flex h-9 flex-row items-center justify-center rounded-lg p-0.5',
        Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
        className
      )}
      {...props}
    />
  );
};

const TabsTrigger: React.FC<
  TabsPrimitive.TriggerProps & React.RefAttributes<TabsPrimitive.TriggerRef>
> = ({ className, ...props }) => {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-muted-foreground text-sm font-medium',
        value === props.value && 'text-foreground'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5',
          Platform.select({
            web: 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring web:h-[calc(100%-1px)] inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          props.value === value && 'bg-input/30 border-foreground/10',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
};

const TabsContent: React.FC<
  TabsPrimitive.ContentProps & React.RefAttributes<TabsPrimitive.ContentRef>
> = ({ className, ...props }) => {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
};

export { Tabs, TabsContent, TabsList, TabsTrigger };
