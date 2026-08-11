import React from 'react';
import type { Candidate } from '../../types';

interface TechnicalTestDocumentProps {
  candidate: Candidate;
  questions: any[];
}

export function TechnicalTestDocument({ candidate, questions }: TechnicalTestDocumentProps) {
  return (
    <div className="bg-white w-[794px] min-h-[1123px] text-black font-sans mx-auto shadow-lg border border-slate-200 relative print:shadow-none print:border-none print:w-full print:h-full">
      <div className="p-8 h-full flex flex-col">
        {/* Header Block */}
        <div className="flex justify-between items-start mb-1 relative">
          {/* Logo / Company Name */}
          <div className="pt-0">
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-0">
              TOYOTA
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 leading-tight">
              Motor Corporation
            </h2>
            <p className="text-[9px] mt-1 italic text-gray-600">
              *candidates with one year experience and above
            </p>
          </div>

          {/* Right Info Box */}
          <div className="border-[2px] border-black w-[220px]">
            <div className="border-b-[2px] border-black text-center font-bold py-0 bg-gray-100 text-xs">
              Series B
            </div>
            <div className="border-b-[2px] border-black text-center font-bold py-0 text-[10px]">
              Version 2020.1
            </div>
            <div className="px-2 py-0 border-b border-black text-[10px] flex gap-1">
              <span className="font-semibold">Date:</span>
              <span className="flex-1 border-b border-gray-400 mt-2"></span>
            </div>
            <div className="px-2 py-0 text-[10px] flex gap-1">
              <span className="font-semibold">Time:</span>
              <span className="flex-1 border-b border-gray-400 mt-2"></span>
            </div>
          </div>
        </div>

        {/* HR Title */}
        <div className="border-b-[2px] border-black pb-0.5 mb-1 text-center mt-4">
          <h2 className="text-[12px] font-bold uppercase">Human Resources Department</h2>
        </div>

        {/* Candidate Info */}
        <div className="border-b-[2px] border-black pb-0.5 mb-1">
          <div className="flex text-[11px] mb-0.5 px-1 mt-1">
            <span className="font-semibold mr-2 whitespace-nowrap">Name of the Candidate:</span>
            <span className="flex-1 font-medium font-sans uppercase border-b border-gray-400 leading-tight flex items-end">
              {candidate.full_name}
            </span>
          </div>
          <div className="flex text-[11px] px-1 mb-2">
            <span className="font-semibold mr-2 whitespace-nowrap">Position Applied For:</span>
            <span className="flex-1 font-medium font-sans uppercase border-b border-gray-400 leading-tight flex items-end">
              {candidate.department}
            </span>
          </div>
        </div>

        {/* Paper Title */}
        <div className="border-b-[2px] border-black pb-0.5 mb-2 mt-4 text-center">
          <h3 className="text-[12px] font-bold">Question Paper - {candidate.department || 'Call Centre'}</h3>
        </div>

        {/* Questions Table */}
        <table className="w-full border-collapse border-[2px] border-black text-[13px] leading-snug">
          <thead>
            <tr className="border-b-[2px] border-black">
              <th className="border-r-[2px] border-black w-10"></th>
              <th className="border-r-[2px] border-black text-left p-1"></th>
              <th className="border-r-[2px] border-black w-16 text-center font-bold text-[11px] leading-tight p-1 bg-gray-50">
                Max.<br />Marks
              </th>
              <th className="w-20 text-center font-bold text-[11px] leading-tight p-1 bg-gray-50">
                Marks<br />Obtained
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => (
              <tr key={q.id} className="border-b-[2px] border-black">
                <td className="border-r-[2px] border-black text-center align-top pt-1 font-medium">
                  {idx + 1}
                </td>
                <td className="border-r-[2px] border-black p-1 align-top">
                  <div className="font-bold mb-1">{q.text}</div>
                  {Object.keys(q.options || {}).length > 0 ? (
                    <div className="pl-1 text-xs">
                      {Object.entries(q.options).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex gap-1.5 items-start mb-0.5">
                          <span className="font-medium">{k.toUpperCase()}.</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-6"></div>
                  )}
                </td>
                <td className="border-r-[2px] border-black text-center align-middle font-bold text-[14px]">
                  1
                </td>
                <td className="text-center align-middle font-bold text-xl text-blue-800" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>
                  {/* Candidate might have taken the test, we'll try to find the score if applicable, but standard print is blank. 
                      Let's leave it blank or show grade if available. */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
