import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

interface PlaylistNameDialogProps {
  open: boolean;
  title: string;
  defaultName?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onOpenChange: (open: boolean) => void;
}

// Small text-prompt dialog used to name a playlist when saving a multi-select
// batch of episodes from a season pack.
export const PlaylistNameDialog: React.FC<PlaylistNameDialogProps> = ({
  open,
  title,
  defaultName,
  submitLabel,
  onSubmit,
  onOpenChange,
}) => {
  const [name, setName] = useState(defaultName ?? "");

  useEffect(() => {
    if (open) setName(defaultName ?? "");
  }, [open, defaultName]);

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onOpenChange(false);
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Playlist name"
          autoFocus
          onSubmitEditing={confirm}
        />
        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button disabled={!name.trim()} onPress={confirm}>
            <Text>{submitLabel ?? "Save"}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
