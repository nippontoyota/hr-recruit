SET search_path TO recruitment;

-- Fix candidates table
UPDATE candidates SET current_stage = 'BRANCH_INTERVIEW' WHERE current_stage = 'HR_INTERVIEW';
UPDATE candidates SET current_stage = 'TEST' WHERE current_stage IN ('DEPARTMENT_INTERVIEW', 'BRANCH_EVALUATION');

-- Fix stage_history table
UPDATE stage_history SET from_stage = 'BRANCH_INTERVIEW' WHERE from_stage = 'HR_INTERVIEW';
UPDATE stage_history SET from_stage = 'TEST' WHERE from_stage IN ('DEPARTMENT_INTERVIEW', 'BRANCH_EVALUATION');
UPDATE stage_history SET to_stage = 'BRANCH_INTERVIEW' WHERE to_stage = 'HR_INTERVIEW';
UPDATE stage_history SET to_stage = 'TEST' WHERE to_stage IN ('DEPARTMENT_INTERVIEW', 'BRANCH_EVALUATION');
