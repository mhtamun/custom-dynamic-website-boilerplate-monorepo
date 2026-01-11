import React, { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Modal = (props: {
  visible: boolean;
  header: string;
  children: ReactNode;
  button?: {
    label?: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  };
  onHide: () => void;
}) => {
  const { visible, header, children: body, button, onHide } = props;

  return (
    <Dialog open={visible} onOpenChange={onHide}>
      <DialogContent className="max-w-[90vw] md:max-w-[50vw]">
        <DialogHeader>
          <DialogTitle>{header}</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[80vh] overflow-y-auto custom-scrollbar px-1">{body}</div>
        {button && (
          <DialogFooter>
            <Button type="button" variant={button.variant ?? 'default'} onClick={button.onClick}>
              {button.icon}
              {button.label ?? 'OK'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
