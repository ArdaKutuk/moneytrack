import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title=""
      width="380px"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 -mt-2">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            destructive ? "bg-[rgba(251,113,133,0.14)] text-accent-red" : "bg-[rgba(96,165,250,0.14)] text-accent-blue"
          }`}
        >
          <AlertTriangle size={17} />
        </div>
        <div>
          <div className="text-[14.5px] font-bold text-text">{title}</div>
          <div className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">{message}</div>
        </div>
      </div>
    </Modal>
  );
}
