import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
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
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  "fixed left-[50%] top-[50%] z-50 flex flex-col",
                  "translate-x-[-50%] translate-y-[-50%]",
                  size === 'full' && "w-[95vw] lg:w-[90vw] xl:w-[90vw] h-[95vh] lg:h-[90vh]",
                  size === 'lg' && "w-[90vw] max-w-4xl max-h-[90vh]",
                  size === 'md' && "w-[90vw] max-w-2xl max-h-[90vh]",
                  size === 'sm' && "w-[90vw] max-w-md max-h-[90vh]",
                  "bg-surface border border-dashed border-border rounded-none overflow-hidden"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-dashed border-border px-6 py-4 bg-surface z-10">
                  <div>
                    {title && (
                      <DialogPrimitive.Title className="text-xl font-semibold text-text-primary">
                        {title}
                      </DialogPrimitive.Title>
                    )}
                    {description && (
                      <DialogPrimitive.Description className="text-sm text-text-secondary mt-1">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  <DialogPrimitive.Close asChild>
                    <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                {/* Body */}
                <div className="relative flex-1 overflow-hidden bg-background">
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
