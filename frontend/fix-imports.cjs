const fs = require('fs');

const files = {
  'src/api/candidates.ts': [
    ['import { Candidate }', 'import type { Candidate }']
  ],
  'src/auth/AuthContext.tsx': [
    ['import { createContext, useContext, useState, useEffect, ReactNode } from \'react\';', 'import { createContext, useContext, useState, useEffect } from \'react\';\nimport type { ReactNode } from \'react\';'],
    ['import { User, UserRole }', 'import type { User, UserRole }']
  ],
  'src/components/guards/RoleRoute.tsx': [
    ['import { Navigate } from \'react-router-dom\';\n', ''],
    ['import { UserRole }', 'import type { UserRole }']
  ],
  'src/components/layout/PageHeader.tsx': [
    ['import { ReactNode }', 'import type { ReactNode }']
  ],
  'src/components/ui/Badge.tsx': [
    ['import { HTMLAttributes }', 'import type { HTMLAttributes }'],
    ['import { cn, stageColor, stageLabel } from \'../../lib/utils\';', 'import { cn } from \'../../lib/utils\';'],
    ['import { PipelineStage }', 'import type { PipelineStage }']
  ],
  'src/components/ui/Button.tsx': [
    ['import { ButtonHTMLAttributes, forwardRef } from \'react\';', 'import { forwardRef } from \'react\';\nimport type { ButtonHTMLAttributes } from \'react\';']
  ],
  'src/components/ui/Card.tsx': [
    ['import { HTMLAttributes, forwardRef } from \'react\';', 'import { forwardRef } from \'react\';\nimport type { HTMLAttributes } from \'react\';']
  ],
  'src/components/ui/DataTable.tsx': [
    ['import { ReactNode }', 'import type { ReactNode }']
  ],
  'src/components/ui/EmptyState.tsx': [
    ['import { ReactNode }', 'import type { ReactNode }']
  ],
  'src/components/ui/Input.tsx': [
    ['import { InputHTMLAttributes, forwardRef } from \'react\';', 'import { forwardRef } from \'react\';\nimport type { InputHTMLAttributes } from \'react\';']
  ],
  'src/components/ui/Select.tsx': [
    ['import { SelectHTMLAttributes, forwardRef } from \'react\';', 'import { forwardRef } from \'react\';\nimport type { SelectHTMLAttributes } from \'react\';']
  ],
  'src/lib/constants.ts': [
    ['import { PipelineStage }', 'import type { PipelineStage }']
  ],
  'src/lib/navigation.ts': [
    ['import { UserRole }', 'import type { UserRole }']
  ],
  'src/pages/candidates/CandidateProfile.tsx': [
    ['import { Candidate }', 'import type { Candidate }'],
    ['import { ArrowLeft, User, FileText, MessageSquare, Clock, Phone, Mail, MapPin }', 'import { ArrowLeft, User, FileText, MessageSquare, Clock, Phone, Mail }']
  ],
  'src/pages/candidates/CandidatesList.tsx': [
    ['import { Candidate }', 'import type { Candidate }']
  ],
  'src/pages/Settings.tsx': [
    ['import { Card, CardHeader, CardTitle, CardContent }', 'import { Card, CardHeader, CardTitle }']
  ]
};

for (const [file, replacements] of Object.entries(files)) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(file, content);
}
console.log('Fixed imports');
