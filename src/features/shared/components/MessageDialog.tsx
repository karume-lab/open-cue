import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";

interface MessageDialogProps {
  open: boolean;
  title: string;
  message: string;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
}

/**
 * A single-action dialog used wherever the app previously showed a native
 * Alert: a title, a message, and one acknowledgement button.
 */
export const MessageDialog: React.FC<MessageDialogProps> = ({
  open,
  title,
  message,
  onOpenChange,
  actionLabel = "OK",
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <Button onPress={() => onOpenChange(false)}>
          <Text>{actionLabel}</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
