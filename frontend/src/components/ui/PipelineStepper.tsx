import React from 'react';
import type { PipelineStage } from '../../types';
import { Check, X, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface PipelineStepperProps {
  currentStage: PipelineStage;
  direction?: 'horizontal' | 'vertical';
}

const LINEAR_STAGES: PipelineStage[] = [
  'SCREENING',
  'CANDIDATE_FORM',
  'HR_INTERVIEW',
  'DEPARTMENT_INTERVIEW',
  'FINAL_APPROVAL',
  'HIRED'
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  SCREENING: 'Screening',
  CANDIDATE_FORM: 'Candidate Form',
  HR_INTERVIEW: 'HR Interview',
  DEPARTMENT_INTERVIEW: 'Department Interview',
  FINAL_APPROVAL: 'Final Approval',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold'
};

// Stage specific colors have been optimized into a standard "amber/yellow" in-progress state.

export function PipelineStepper({ currentStage, direction = 'horizontal' }: PipelineStepperProps) {
  const currentIndex = LINEAR_STAGES.indexOf(currentStage);
  const isTerminal = currentStage === 'REJECTED' || currentStage === 'ON_HOLD';

  if (direction === 'vertical') {
    return (
      <div className="w-full space-y-6">
        <div className="relative ml-4 space-y-10 py-2">
          {LINEAR_STAGES.map((stage, idx) => {
            const isCompleted = !isTerminal && idx < currentIndex;
            const isCurrent = !isTerminal && idx === currentIndex;
            const isUpcoming = !isTerminal && idx > currentIndex;
            const isLast = idx === LINEAR_STAGES.length - 1;

            return (
              <div key={stage} className="relative pl-10 flex items-center h-8">
                
                {/* Connector Line */}
                {!isLast && (
                  <div className={cn(
                    "absolute left-0 top-8 w-0.5 h-10 -translate-x-1/2 transition-colors duration-300",
                    isCompleted && idx < currentIndex - 1 ? "bg-success/40" : "bg-border/60"
                  )} />
                )}

                {/* Node Circle */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  className={cn(
                    "absolute left-0 top-0 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 z-10 shadow-sm transition-all duration-300 bg-surface",
                    isCompleted && "bg-success/10 border-success/30 text-success",
                    isCurrent && "border-transparent text-white shadow-md scale-110 bg-amber-500",
                    isUpcoming && "border-border/80 text-muted-foreground"
                  )}
                >
                  {isCompleted && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-success">
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isCurrent && (
                    <motion.span 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                      className="h-2 w-2 rounded-full bg-white" 
                    />
                  )}
                  {isUpcoming && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                </motion.div>
                
                <span className={cn(
                  "text-[15px] tracking-tight transition-colors duration-200",
                  isCompleted && "text-text-primary font-medium",
                  isCurrent && "text-amber-600 font-bold",
                  isUpcoming && "text-text-secondary/60 font-medium"
                )}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>

        {isTerminal && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-6 p-4 rounded-[12px] text-sm font-semibold flex items-center gap-2 border shadow-sm mx-4",
              currentStage === 'REJECTED' ? "bg-danger/5 border-danger/20 text-danger" : "bg-warning/5 border-warning/20 text-warning"
            )}
          >
            {currentStage === 'REJECTED' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            Candidate is {STAGE_LABELS[currentStage]}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full mt-4 mb-6">
      <div className="flex items-center justify-between gap-1 border border-border bg-surface rounded-[12px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-x-auto w-full">
        {LINEAR_STAGES.map((stage, idx) => {
          const isCompleted = !isTerminal && idx < currentIndex;
          const isCurrent = !isTerminal && idx === currentIndex;
          const isUpcoming = !isTerminal && idx > currentIndex;
          
          const showConnector = idx < LINEAR_STAGES.length - 1;

          return (
            <React.Fragment key={stage}>
              <div className="flex items-center gap-2 py-1 px-2 rounded-[8px] transition-all duration-200">
                {isCompleted && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                {isCurrent && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full text-white shrink-0 shadow-sm transition-colors duration-300 bg-amber-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                )}
                {isUpcoming && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  </div>
                )}
                <span className={cn(
                  "text-xs tracking-tight transition-colors duration-200",
                  isCompleted && "text-text-primary font-medium",
                  isCurrent && "text-amber-600 font-bold",
                  isUpcoming && "text-text-secondary/50 font-medium"
                )}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              {showConnector && (
                <ChevronRight className="w-3.5 h-3.5 text-border/60 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {isTerminal && (
        <div className={cn(
          "mt-3 p-3 rounded-[10px] text-xs font-semibold flex items-center gap-2 border",
          currentStage === 'REJECTED' ? "bg-danger/5 border-danger/20 text-danger" : "bg-warning/5 border-warning/20 text-warning"
        )}>
          {currentStage === 'REJECTED' ? <X className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          Candidate is currently {STAGE_LABELS[currentStage]}
        </div>
      )}
    </div>
  );
}
