import React from 'react';
import { cn } from '../../lib/utils';
import { 
  ClipboardList, 
  FileText, 
  Users, 
  Building2, 
  ShieldCheck, 
  Check
} from 'lucide-react';
import type { PipelineStage } from '../../types';
import { stageLabel } from '../../lib/stages';
import { motion, AnimatePresence } from 'framer-motion';

interface PipelineStepperProps {
  stages: PipelineStage[];
  currentStage: PipelineStage;
  onStageClick: (stage: PipelineStage) => void;
  isLoading?: boolean;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  'SCREENING': ClipboardList,
  'CANDIDATE_FORM': FileText,
  'HR_INTERVIEW': Users,
  'DEPARTMENT_INTERVIEW': Building2,
  'FINAL_APPROVAL': ShieldCheck,
};

export function PipelineStepper({ stages, currentStage, onStageClick, isLoading }: PipelineStepperProps) {
  const currentIndex = stages.indexOf(currentStage);
  
  const isTerminalStage = currentIndex === -1;
  const activeIndex = isTerminalStage ? stages.length : currentIndex;

  return (
    <div className="w-full py-4 overflow-x-auto no-scrollbar">
      <div className="flex items-start justify-between min-w-[600px] relative px-4">
        
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
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const Icon = STAGE_ICONS[stage] || FileText;
          
          const isClickable = !isLoading && !isTerminalStage && (isCompleted || index === activeIndex + 1);

          return (
            <motion.div 
              key={stage} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center gap-2 relative group w-20"
            >
              
              {/* Pulse effect for current stage */}
              {isCurrent && (
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
                whileHover={isClickable && !isCurrent ? { scale: 1.1, y: -2 } : {}}
                whileTap={isClickable && !isCurrent ? { scale: 0.95 } : {}}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 relative bg-background border-2",
                  isCompleted ? "border-success bg-success/5 text-success shadow-sm" :
                  isCurrent ? "border-success bg-success text-white shadow-md" :
                  "border-muted text-muted-foreground",
                  isClickable && !isCurrent ? "cursor-pointer hover:border-success hover:text-success" : "cursor-not-allowed",
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
              <div className="flex flex-col items-center mt-1">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider mb-0.5 transition-colors duration-300",
                  isCurrent ? "text-success" : "text-muted-foreground/60"
                )}>
                  Step {index + 1}
                </span>
                <span className={cn(
                  "text-[11px] font-semibold text-center w-24 text-balance leading-tight transition-colors duration-300",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
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
