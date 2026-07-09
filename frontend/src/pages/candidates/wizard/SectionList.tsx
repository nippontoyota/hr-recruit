import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { WizardSection, SectionStatus, WizardSectionId } from './wizardTypes';

interface SectionListProps {
  sections: WizardSection[];
  getSectionStatus: (id: WizardSectionId) => SectionStatus;
  activeSection: WizardSectionId;
  onSelectSection: (id: WizardSectionId) => void;
}

export const SectionList = ({ sections, getSectionStatus, activeSection, onSelectSection }: SectionListProps) => {
  return (
    <div className="flex space-x-2 overflow-x-auto px-1 py-2 custom-scrollbar scroll-smooth">
      {sections.map((section) => {
        const status = getSectionStatus(section.id);
        const Icon = section.icon;

        return (
          <button
            key={section.id}
            onClick={() => onSelectSection(section.id)}
            className={cn(
              "group relative flex items-center justify-between px-4 py-2 border rounded-lg transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 flex-shrink-0 hover:z-10",
              activeSection === section.id
                ? "bg-primary/5 border-primary/30 text-primary shadow-sm shadow-primary/20 ring-1 ring-primary/10 z-10" 
                : status === 'Complete'
                ? "bg-success/10 border-success/30 text-success shadow-sm hover:shadow-md hover:-translate-y-0.5"
                : "bg-surface border-border/50 text-text-secondary shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-border hover:text-text-primary"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                activeSection === section.id ? "text-primary" : "text-text-secondary group-hover:text-primary"
              )} />
              <span className="text-sm font-medium whitespace-nowrap">
                {section.title}
              </span>
              <div className="ml-1">
                {status === 'Complete' && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                {status === 'Partial' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
