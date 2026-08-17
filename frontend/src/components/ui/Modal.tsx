import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, description, size = 'full', children }: ModalProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="fixed inset-0 z-50 bg-black/50"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content
              asChild
              forceMount
              onPointerDownOutside={(event) => {
                const target = event.detail.originalEvent.target as HTMLElement | null;
                if (target?.closest('button, [role="button"]')) {
                  event.preventDefault();
                }
              }}
              onInteractOutside={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest('button, [role="button"]')) {
                  event.preventDefault();
                }
              }}
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  "fixed left-[50%] top-[50%] z-50 flex flex-col",
                  "translate-x-[-50%] translate-y-[-50%]",
                  size === 'full' && "w-[95vw] lg:w-[90vw] xl:w-[90vw] h-[95vh] lg:h-[90vh]",
                  size === 'lg' && "w-[90vw] max-w-4xl max-h-[90vh]",
                  size === 'md' && "w-[90vw] max-w-2xl max-h-[90vh]",
                  size === 'sm' && "w-[90vw] max-w-md max-h-[90vh]",
                  "bg-surface border border-border rounded-xl shadow-lg overflow-hidden"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface z-10 shrink-0">
                  <div>
                    <DialogPrimitive.Title className={cn(
                      'text-xl font-semibold text-text-primary',
                      !title && 'sr-only',
                    )}>
                      {title || 'Dialog'}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className={cn(
                      'text-sm text-text-secondary mt-1',
                      !description && 'sr-only',
                    )}>
                      {description || 'Dialog content'}
                    </DialogPrimitive.Description>
                  </div>
                <DialogPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close dialog"
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                {/* Body */}
                <div className="relative flex-1 bg-background overflow-y-auto custom-scrollbar">
                  {children}
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
};
