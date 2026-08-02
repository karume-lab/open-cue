import type React from 'react';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { View, type ViewProps } from 'react-native';

const Card: React.FC<ViewProps & React.RefAttributes<View>> = ({ className, ...props }) => {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          'bg-card border-border flex flex-col gap-6 rounded-md border py-6 shadow-sm shadow-black/5',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
};

const CardHeader: React.FC<ViewProps & React.RefAttributes<View>> = ({ className, ...props }) => {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
};

const CardTitle: React.FC<
  React.ComponentProps<typeof Text> & React.RefAttributes<Text>
> = ({ className, ...props }) => {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
};

const CardDescription: React.FC<
  React.ComponentProps<typeof Text> & React.RefAttributes<Text>
> = ({ className, ...props }) => {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
};

const CardContent: React.FC<ViewProps & React.RefAttributes<View>> = ({ className, ...props }) => {
  return <View className={cn('px-6', className)} {...props} />;
};

const CardFooter: React.FC<ViewProps & React.RefAttributes<View>> = ({ className, ...props }) => {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
};

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
