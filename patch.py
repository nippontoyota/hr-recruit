import re

with open('frontend/src/pages/candidates/CandidateProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. LINEAR_STAGES
content = content.replace(
    "'SCREENING', 'CANDIDATE_FORM', 'HR_INTERVIEW', 'DEPARTMENT_INTERVIEW', 'BRANCH_EVALUATION', 'FINAL_APPROVAL', 'HIRED'",
    "'CANDIDATE_FORM', 'HR_INTERVIEW', 'DEPARTMENT_INTERVIEW', 'BRANCH_EVALUATION', 'FINAL_APPROVAL', 'HIRED'"
)

# 2. State
content = content.replace("const [editStageSelection, setEditStageSelection] = useState<PipelineStage>('SCREENING');", "const [editStageSelection, setEditStageSelection] = useState<PipelineStage>('CANDIDATE_FORM');")
content = content.replace("const [resumeStage, setResumeStage] = useState<PipelineStage>('SCREENING');", "const [resumeStage, setResumeStage] = useState<PipelineStage>('CANDIDATE_FORM');")

# 3. Fetch
content = content.replace('''      const [res, evals, screen] = await Promise.all([
        getCandidateById(id),
        getCandidateEvaluations(id).catch(() => []),
        getScreening(id).catch(() => null)
      ]);
      
      if (res) {
        profileCache[id] = res;
        setCandidate(res);
        setEvaluations(evals);
        setScreening(screen);
      } else {''', '''      const [res, evals] = await Promise.all([
        getCandidateById(id),
        getCandidateEvaluations(id).catch(() => [])
      ]);
      
      if (res) {
        profileCache[id] = res;
        setCandidate(res);
        setEvaluations(evals);
      } else {''')

# 4. Completed stages screening logic
content = content.replace('''    // 1. SCREENING
    if (screening && (screening.status === 'QUALIFIED' || screening.status === 'REJECTED')) {
      completedStages.push('SCREENING');
    }
    
    // 2. CANDIDATE_FORM''', '''    // 1. CANDIDATE_FORM''')

# 5. JSX ScreeningChecklist
content = content.replace('''            {stageToView === 'SCREENING' && (
              <ScreeningChecklist
                candidateId={candidate.id}
                onUpdate={handleUpdate}
              />
            )}

            {stageToView === 'CANDIDATE_FORM' && (''', '''            {stageToView === 'CANDIDATE_FORM' && (''')

# 6. Modal Option
content = content.replace('''              <select 
                value={editStageSelection} 
                onChange={(e) => setEditStageSelection(e.target.value as PipelineStage)}
                className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="SCREENING">Screening</option>
                <option value="CANDIDATE_FORM">Candidate Form</option>''', '''              <select 
                value={editStageSelection} 
                onChange={(e) => setEditStageSelection(e.target.value as PipelineStage)}
                className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="CANDIDATE_FORM">Candidate Form</option>''')

with open('frontend/src/pages/candidates/CandidateProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
