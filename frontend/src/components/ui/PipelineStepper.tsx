import React from 'react';
import { cn } from '../../lib/utils';
import { 
  ClipboardList, 
  FileText, 
  Users, 
  ShieldCheck, 
  Check,
  Pause
} from 'lucide-react';
import type { PipelineStage } from '../../types';
import { stageLabel } from '../../lib/stages';
import { motion, AnimatePresence } from 'framer-motion';

interface PipelineStepperProps {
  stages: PipelineStage[];
  currentStage: PipelineStage; // Viewed stage
  actualStage: PipelineStage;  // DB stage
  onStageClick: (stage: PipelineStage) => void;
  isLoading?: boolean;
  completedStages?: PipelineStage[];
  skippedStages?: PipelineStage[];
  heldStages?: PipelineStage[];
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  'SCREENING': ClipboardList,
  'CANDIDATE_FORM': FileText,
  'BRANCH_INTERVIEW': Users,
  'FINAL_APPROVAL': ShieldCheck,
};

export function PipelineStepper({ 
  stages, 
  currentStage, 
  actualStage,
  onStageClick, 
  isLoading,
  completedStages,
  skippedStages,
  heldStages
}: PipelineStepperProps) {
  const currentIndex = stages.indexOf(actualStage);
  const viewedIndex = stages.indexOf(currentStage);
  
  const isTerminalStage = currentIndex === -1;
  let activeIndex = isTerminalStage ? stages.length : currentIndex;
  
  if (isTerminalStage && actualStage === 'ON_HOLD' && heldStages && heldStages.length > 0) {
    const heldIdx = stages.findIndex(s => heldStages.includes(s));
    if (heldIdx !== -1) activeIndex = heldIdx;
  }

  const safeStageCount = stages.length || 1;
  const progressPercentage = Math.min(100, Math.max(0, ((activeIndex + 1) / safeStageCount) * 100));

  return (
    <div className="w-full py-2">
      {/* Mobile view: simple text-based progress */}
      <div className="flex flex-col items-center gap-1 md:hidden py-1 select-none">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-success">
          Step {activeIndex + 1} of {stages.length}
        </span>
        <span className="text-sm font-bold text-foreground text-center">
          {isTerminalStage ? 'Completed' : stageLabel(actualStage)}
        </span>
        {/* Compact progress bar */}
        <div className="w-24 bg-muted h-1 rounded-full overflow-hidden mt-1.5">
          <div 
            className="bg-success h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Desktop view: full horizontal stepper */}
      <div className="hidden md:flex items-start justify-between relative px-4 w-full">
        {/* Background connecting line */}
        <div className="absolute top-5 left-12 right-12 h-[2px] bg-muted/60 -z-10" />

        {/* Active connecting line (progress) */}
        {!isTerminalStage && activeIndex > 0 && (
          <motion.div 
            className="absolute top-5 left-12 h-[2px] bg-success -z-10 origin-left" 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
            style={{ width: `calc(${(activeIndex / (stages.length - 1)) * 100}% - 6rem)` }}
          />
        )}

        {stages.map((stage, index) => {
          const isCompleted = completedStages ? completedStages.includes(stage) : index < activeIndex;
          const isSkipped = skippedStages ? skippedStages.includes(stage) : false;
          const isHeld = heldStages ? heldStages.includes(stage) : false;
          
          const isCurrentActual = index === activeIndex && actualStage !== 'ON_HOLD' && actualStage !== 'REJECTED';
          const isCurrentViewed = index === viewedIndex;
          
          const Icon = STAGE_ICONS[stage] || FileText;
          const isClickable = !isLoading && !isTerminalStage && !isCurrentViewed;

          return (
            <motion.div 
              key={stage} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center gap-2 relative group w-20"
            >
              
              {/* Pulse effect for actual stage */}
              {isCurrentActual && (
                <motion.div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-success/20 -z-10"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Circle Node */}
              <motion.button
                disabled={!isClickable}
                onClick={() => isClickable && onStageClick(stage)}
                whileHover={isClickable && !isCurrentViewed ? { scale: 1.1, y: -2 } : {}}
                whileTap={isClickable && !isCurrentViewed ? { scale: 0.95 } : {}}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative bg-background border-2",
                  isCurrentViewed ? "ring-2 ring-primary ring-offset-2 scale-105" : "",
                  isCompleted ? "border-success bg-success/5 text-success shadow-sm" :
                  isHeld ? "border-warning bg-warning/5 text-warning shadow-sm ring-2 ring-warning/30" :
                  isSkipped ? "border-warning border-dashed bg-warning/5 text-warning shadow-sm" :
                  isCurrentActual ? "border-success bg-success text-white shadow-md" :
                  "border-muted text-muted-foreground",
                  isClickable && !isCurrentViewed ? "cursor-pointer hover:border-success hover:text-success" : "cursor-not-allowed",
                  isTerminalStage && "opacity-60"
                )}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="completed"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </motion.div>
                  ) : isHeld ? (
                    <motion.div
                      key="held"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    >
                      <Pause className="w-4 h-4 fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="incomplete"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Stage Label */}
              <div className="flex flex-col items-center mt-1 select-none">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider mb-0.5 transition-colors duration-300",
                  isCurrentViewed ? "text-primary font-extrabold" :
                  isCurrentActual ? "text-success" :
                  (isSkipped || isHeld) ? "text-warning" : 
                  "text-muted-foreground/60"
                )}>
                  {isHeld ? "On Hold" : isSkipped ? "Skipped" : isCompleted ? "Completed" : `Step ${index + 1}`}
                </span>
                <span className={cn(
                  "text-[11px] font-semibold text-center w-24 text-balance leading-tight transition-colors duration-300",
                  isCurrentViewed ? "text-foreground font-bold" : "text-muted-foreground"
                )}>
                  {stageLabel(stage)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

