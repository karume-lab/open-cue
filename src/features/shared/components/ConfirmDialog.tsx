import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";

interface ConfirmDialogAction {
  label: string;
  onPress: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  actions: ConfirmDialogAction[];
  onOpenChange: (open: boolean) => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  actions,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "default"}
              onPress={() => {
                onOpenChange(false);
                action.onPress();
              }}
            >
              <Text>{action.label}</Text>
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
