import type { ReactNode } from 'react';
import { Button, Modal } from '../ui';
import { cn } from '../../lib/utils';

interface WhatsAppSendChoicesProps {
  onDoubleTick: () => void;
  onOpenWhatsApp: () => void;
  doubleTickLoading?: boolean;
  disabled?: boolean;
  openWhatsAppDisabled?: boolean;
  stacked?: boolean;
}

export function WhatsAppSendChoices({
  onDoubleTick,
  onOpenWhatsApp,
  doubleTickLoading = false,
  disabled = false,
  openWhatsAppDisabled = false,
  stacked = false,
}: WhatsAppSendChoicesProps) {
  const whatsappButton = (
    <Button
      type="button"
      size={stacked ? 'lg' : 'md'}
      className={cn(
        '!bg-[#25D366] hover:!bg-[#1ebe5d] !text-white shadow-sm',
        stacked && 'w-full text-[15px]'
      )}
      onClick={onOpenWhatsApp}
      disabled={disabled || doubleTickLoading || openWhatsAppDisabled}
    >
      Open WhatsApp to send
    </Button>
  );

  const doubleTickButton = (
    <Button
      type="button"
      variant="secondary"
      className={stacked ? 'w-full' : undefined}
      onClick={onDoubleTick}
      isLoading={doubleTickLoading}
      disabled={disabled}
    >
      Send via DoubleTick
    </Button>
  );

  return (
    <div
      className={cn(
        'flex gap-2',
        stacked ? 'flex-col' : 'flex-col-reverse sm:flex-row justify-end'
      )}
      aria-label="Choose how to send this WhatsApp message"
    >
      {stacked ? (
        <>
          {whatsappButton}
          {doubleTickButton}
        </>
      ) : (
        <>
          {doubleTickButton}
          {whatsappButton}
        </>
      )}
    </div>
  );
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  title,
  description,
  preview,
  children,
  onDoubleTick,
  onOpenWhatsApp,
  doubleTickLoading = false,
  sendDisabled = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  preview?: string;
  children?: ReactNode;
  onDoubleTick: () => void;
  onOpenWhatsApp: () => void;
  doubleTickLoading?: boolean;
  sendDisabled?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <div className="text-sm leading-6 text-foreground">{description}</div>
        {preview ? (
          <p className="text-xs text-muted-foreground break-all bg-muted/40 rounded-lg px-3 py-2">{preview}</p>
        ) : null}
        {children}
        <div className="border-t border-border pt-4">
          <WhatsAppSendChoices
            onDoubleTick={onDoubleTick}
            onOpenWhatsApp={onOpenWhatsApp}
            doubleTickLoading={doubleTickLoading}
            disabled={sendDisabled}
          />
        </div>
      </div>
    </Modal>
  );
}
