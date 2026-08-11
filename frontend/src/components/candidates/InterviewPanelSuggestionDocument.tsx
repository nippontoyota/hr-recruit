import React from 'react';
import type { Candidate, Evaluation } from '../../types';

interface InterviewPanelSuggestionDocumentProps {
  candidate: Candidate;
  evaluations: Evaluation[];
}

export function InterviewPanelSuggestionDocument({ candidate, evaluations }: InterviewPanelSuggestionDocumentProps) {
  // We expect 5 rows. First two from Branch, next three from HO.
  // Assuming 'BRANCH_HR' and 'DEPT_HEAD' are the branch ones.
  const rowTypes = [
    { type: 'BRANCH_HR', name: 'HR (Branch)' },
    { type: 'DEPT_HEAD', name: 'Dept Head (Branch)' },
    { type: 'HO_1', name: 'HO Interview 1' },
    { type: 'HO_2', name: 'HO Interview 2' },
    { type: 'HO_3', name: 'HO Interview 3' },
  ];

  const getEval = (type: string) => evaluations.find(e => e.type === type);

  // Format Date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white w-[794px] h-[1123px] text-black font-sans mx-auto overflow-hidden shadow-lg border border-slate-200 relative print:shadow-none print:border-none print:w-full print:h-full">
      <div className="p-8 h-full flex flex-col">
        <h1 className="text-center font-bold text-[13px] border border-black p-1 border-b-0 uppercase tracking-widest">
          Interview Panel Suggestion
        </h1>

        <table className="w-full border-collapse border border-black text-[11px] h-full table-fixed">
          <thead>
            <tr>
              <th className="border border-black font-bold p-1 text-center w-[18%]">Name of the<br/>Panel Member</th>
              <th className="border border-black font-bold p-1 text-center w-[44%]">Comments / Suggestion</th>
              <th className="border border-black font-bold p-1 text-center w-[25%]">Marks</th>
              <th className="border border-black font-bold p-1 text-center w-[13%]">Signature<br/>& Date</th>
            </tr>
          </thead>
          <tbody>
            {rowTypes.map((rt, idx) => {
              const ev = getEval(rt.type);
              
              const attitude = ev?.scores?.attitude || '';
              const communication = ev?.scores?.communication || '';
              const knowledge = ev?.scores?.knowledge || '';
              
              const total = (attitude ? Number(attitude) : 0) + (communication ? Number(communication) : 0) + (knowledge ? Number(knowledge) : 0);

              const isSelected = ev?.verdict === 'SELECTED' || ev?.verdict === 'PASS';
              const isRejected = ev?.verdict === 'REJECTED' || ev?.verdict === 'FAIL';
              const isHold = ev?.verdict === 'ON_HOLD';

              return (
                <tr key={idx} className="border border-black">
                  <td className="border border-black p-2 align-top text-center font-semibold">
                    {ev?.scores?.interviewer_name || rt.name}
                  </td>
                  
                  {/* Comments and Verdict */}
                  <td className="border border-black p-0 align-top relative">
                    <div className="p-2 h-full min-h-[140px] whitespace-pre-wrap font-medium" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>
                      {ev?.remarks || ''}
                    </div>
                    <div className="absolute bottom-1 left-0 w-full flex justify-center gap-6 mt-2 pb-1 text-[10px] font-bold">
                      <div className="flex items-center gap-1">
                        <span>Selected</span>
                        <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-sm">
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Hold</span>
                        <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-sm">
                          {isHold ? '✓' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Rejected</span>
                        <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-sm">
                          {isRejected ? '✓' : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Marks Table */}
                  <td className="border border-black p-0 align-top">
                    <table className="w-full h-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border-b border-r border-black p-1 text-center font-normal text-[10px]">Category</th>
                          <th className="border-b border-r border-black p-1 text-center font-normal text-[9px] w-12">Maximum</th>
                          <th className="border-b border-black p-1 text-center font-normal text-[9px] w-10">Gained</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-b border-r border-black p-1 pl-2">Attitude</td>
                          <td className="border-b border-r border-black p-1 text-center">4</td>
                          <td className="border-b border-black p-1 text-center font-bold text-sm" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{attitude}</td>
                        </tr>
                        <tr>
                          <td className="border-b border-r border-black p-1 pl-2">Communication</td>
                          <td className="border-b border-r border-black p-1 text-center">3</td>
                          <td className="border-b border-black p-1 text-center font-bold text-sm" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{communication}</td>
                        </tr>
                        <tr>
                          <td className="border-b border-r border-black p-1 pl-2">Knowledge</td>
                          <td className="border-b border-r border-black p-1 text-center">3</td>
                          <td className="border-b border-black p-1 text-center font-bold text-sm" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{knowledge}</td>
                        </tr>
                        <tr>
                          <td className="border-r border-black p-1 pl-2 font-bold">Total</td>
                          <td className="border-r border-black p-1 text-center font-bold">10</td>
                          <td className="border-black p-1 text-center font-bold text-base" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{total > 0 ? total : ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* Signature and Date */}
                  <td className="border border-black p-1 align-bottom text-center">
                    <div className="h-full flex flex-col justify-end items-center">
                      {ev && (
                        <>
                          <div className="h-12 w-full flex items-center justify-center opacity-60 overflow-hidden mb-1">
                            <span className="font-signature text-3xl transform -rotate-12" style={{ fontFamily: '"Brush Script MT", "Snell Roundhand", cursive' }}>
                              {ev.scores?.interviewer_name?.split(' ')[0] || ''}
                            </span>
                          </div>
                          <div className="border-t border-black w-3/4 mb-1"></div>
                          <div className="font-semibold">{formatDate(ev.updated_at)}</div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* CMD Comment Section */}
        <div className="mt-0 border border-black border-t-0 flex flex-col h-24">
          <div className="flex border-b border-black bg-gray-50">
            <div className="flex-1 p-1 text-center font-bold text-[11px]">CMD Comment</div>
            <div className="w-[13%] p-1 text-center font-bold text-[11px] border-l border-black">Signature</div>
          </div>
          <div className="flex flex-1">
            <div className="flex-1 p-2 flex items-end justify-center pb-2 gap-8 text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <span>Selected</span>
                <div className="w-5 h-5 border border-black"></div>
              </div>
              <div className="flex items-center gap-2">
                <span>Hold</span>
                <div className="w-5 h-5 border border-black"></div>
              </div>
              <div className="flex items-center gap-2">
                <span>Rejected</span>
                <div className="w-5 h-5 border border-black"></div>
              </div>
            </div>
            <div className="w-[13%] border-l border-black"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
