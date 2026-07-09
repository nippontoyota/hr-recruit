// Removed Back button dependencies

interface SectionWrapperProps {
  title: string;
  children: React.ReactNode;
}

export const SectionWrapper = ({ title, children }: SectionWrapperProps) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
      </div>

      <div className="flex-1 px-1">
        {children}
      </div>
    </div>
  );
};
