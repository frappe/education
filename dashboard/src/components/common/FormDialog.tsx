import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSave: () => void;
  onCancel?: () => void;
  saveText?: string;
  cancelText?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  isScrollable?: boolean;
  saveButtonTestId?: string;
  cancelButtonTestId?: string;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  onCancel,
  saveText = "Save",
  cancelText = "Cancel",
  maxWidth = "lg",
  isScrollable = true,
  saveButtonTestId,
  cancelButtonTestId,
}: FormDialogProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${maxWidthClasses[maxWidth]} ${
          isScrollable ? "max-h-[calc(100vh-200px)] overflow-y-auto" : ""
        }`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid={cancelButtonTestId}
          >
            {cancelText}
          </Button>
          <Button onClick={onSave} data-testid={saveButtonTestId}>
            {saveText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
