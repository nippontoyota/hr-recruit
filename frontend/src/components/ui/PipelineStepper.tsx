import React from 'react';
import { cn } from '../../lib/utils';
import {
  UserCheck,
  Mail,
  MessagesSquare,
  BadgeCheck,
  Code2,
  Check,
  Pause,
  CircleDashed,
  FileText,
  Send,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { PipelineStage } from '../../types';
import { stageLabel } from '../../lib/stages';

interface PipelineStepperProps {
  stages: PipelineStage[];
  currentStage: PipelineStage;
  actualStage: PipelineStage;
  onStageClick: (stage: PipelineStage) => void;
  isLoading?: boolean;
  completedStages?: PipelineStage[];
  skippedStages?: PipelineStage[];
  heldStages?: PipelineStage[];
  customLabels?: Partial<Record<PipelineStage, string>>;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  SCREENING: UserCheck,
  CANDIDATE_FORM: Mail,
  BRANCH_INTERVIEW: MessagesSquare,
  TEST: Code2,
  FINAL_APPROVAL: BadgeCheck,
  CALL_LETTER: Mail,
  INTERVIEWS: MessagesSquare,
  BACKGROUND_VERIFICATION: UserCheck,
  APPLICATION: FileText,
  SENT_TO_HO: Send,
  HO_INTERVIEW_INTIMATION: Send,
  HO_HR_INTERVIEW: MessagesSquare,
  HO_DEPT_INTERVIEW: MessagesSquare,
  HO_INTERVIEWS: MessagesSquare,
  CSS: FileText,
  SALARY_DETAILS: Wallet,
};

export function PipelineStepper({
  stages,
  currentStage,
  actualStage,
  onStageClick,
  isLoading,
  completedStages,
  skippedStages,
  heldStages,
  customLabels,
}: PipelineStepperProps) {
  const currentIndex = stages.indexOf(actualStage);
  const viewedIndex = stages.indexOf(currentStage);

  const isTerminalStage = currentIndex === -1;
  let activeIndex = isTerminalStage ? stages.length : currentIndex;

  if (isTerminalStage && actualStage === 'ON_HOLD' && heldStages && heldStages.length > 0) {
    const heldIdx = stages.findIndex((s) => heldStages.includes(s));
    if (heldIdx !== -1) activeIndex = heldIdx;
  }

  const safeStageCount = stages.length || 1;
  const progressPercentage = Math.min(100, Math.max(0, ((activeIndex + 1) / safeStageCount) * 100));
  const lineProgress =
    stages.length > 1 ? Math.min(100, Math.max(0, (activeIndex / (stages.length - 1)) * 100)) : 0;

  const canGoPrev = !isLoading && viewedIndex > 0;
  const canGoNext = !isLoading && viewedIndex >= 0 && viewedIndex < stages.length - 1;

  const goToPrev = () => {
    if (canGoPrev) onStageClick(stages[viewedIndex - 1]);
  };

  const goToNext = () => {
    if (canGoNext) onStageClick(stages[viewedIndex + 1]);
  };

  const navButtonClass = (enabled: boolean) =>
    cn(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[color,background-color,border-color] duration-150',
      enabled
        ? 'cursor-pointer border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted'
        : 'cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground/40',
    );

  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-3 py-1 md:hidden">
        <button type="button" disabled={!canGoPrev} onClick={goToPrev} className={navButtonClass(canGoPrev)} aria-label="Previous stage">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="w-full truncate text-center text-sm font-semibold text-foreground">
            {isTerminalStage ? 'Completed' : customLabels?.[currentStage] || stageLabel(currentStage)}
          </span>
          <div className="mt-1 h-1 w-full max-w-[10rem] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <button type="button" disabled={!canGoNext} onClick={goToNext} className={navButtonClass(canGoNext)} aria-label="Next stage">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className={cn('mx-auto hidden w-full items-center gap-3 md:flex', stages.length <= 3 ? 'max-w-2xl' : 'max-w-5xl')}>
        <button type="button" disabled={!canGoPrev} onClick={goToPrev} className={navButtonClass(canGoPrev)} aria-label="Previous stage">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className={cn('relative flex min-w-0 flex-1 items-start justify-between px-2', stages.length <= 3 ? 'mx-auto max-w-xl' : 'mx-auto max-w-4xl')}>
          <div className="absolute top-5 right-12 left-12 -z-10 h-0.5 bg-muted" />
          {!isTerminalStage && activeIndex > 0 && (
            <div
              className="absolute top-5 left-12 -z-10 h-0.5 origin-left bg-success transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `calc(${lineProgress}% - 0px)` }}
            />
          )}

          {stages.map((stage, index) => {
            const isCompleted = completedStages ? completedStages.includes(stage) : index < activeIndex;
            const isSkipped = skippedStages ? skippedStages.includes(stage) : false;
            const isHeld = heldStages ? heldStages.includes(stage) : false;
            const isCurrentActual = index === activeIndex && actualStage !== 'ON_HOLD' && actualStage !== 'REJECTED';
            const isCurrentViewed = index === viewedIndex;
            const Icon = STAGE_ICONS[stage] || CircleDashed;
            const isClickable = !isLoading && !isCurrentViewed;

            return (
              <div key={stage} className="relative flex w-20 flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStageClick(stage)}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-[border-color,background-color,transform] duration-150 active:scale-[0.97]',
                    isCurrentViewed && 'ring-2 ring-slate-700 ring-offset-2 dark:ring-slate-300',
                    isCompleted && 'border-success bg-success/5 text-success',
                    isHeld && 'border-warning bg-warning/5 text-warning',
                    isSkipped && 'border-dashed border-warning bg-warning/5 text-warning',
                    isCurrentActual && !isCompleted && 'border-success bg-success text-white',
                    !isCompleted && !isHeld && !isSkipped && !isCurrentActual && 'border-border text-muted-foreground',
                    isClickable ? 'cursor-pointer' : 'cursor-default',
                    isClickable && !isCurrentActual && 'hover:border-success hover:text-success',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : isHeld ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </button>

                <div className="mt-1 flex flex-col items-center">
                  {(isHeld || isCompleted) && (
                    <span
                      className={cn(
                        'mb-0.5 text-[10px] font-medium',
                        isHeld ? 'text-warning' : 'text-success font-semibold',
                      )}
                    >
                      {isHeld ? 'On hold' : 'Done'}
                    </span>
                  )}
                  <span
                    className={cn(
                      'w-24 text-center text-[11px] leading-tight font-medium text-balance',
                      isCurrentViewed ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {customLabels?.[stage] || stageLabel(stage)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" disabled={!canGoNext} onClick={goToNext} className={navButtonClass(canGoNext)} aria-label="Next stage">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
