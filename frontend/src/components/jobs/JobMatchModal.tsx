import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { JobItem } from '../../types';
import { resumeApi, ResumeAnalysisResult } from '../../api/resumeApi';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Loader2,
  Cpu,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface JobMatchModalProps {
  job: JobItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: JobItem) => void;
}

export const JobMatchModal: React.FC<JobMatchModalProps> = ({
  job,
  isOpen,
  onClose,
  onApply,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveAiResult, setLiveAiResult] = useState<ResumeAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!job) return null;

  // Baseline profile-based match
  const profileMatched = job.skills.filter((s) => s.isMatched);
  const profileMissing = job.skills.filter((s) => !s.isMatched);

  // Live Groq AI match results if computed
  const displayScore = liveAiResult ? liveAiResult.atsScore : job.matchScore;
  const isRealAi = Boolean(liveAiResult);

  const matchedList = isRealAi && liveAiResult?.hardSkills && liveAiResult.hardSkills.length > 0
    ? liveAiResult.hardSkills.map((s) => ({ name: s, isMatched: true }))
    : profileMatched;

  const missingList = isRealAi && liveAiResult?.skillGaps && liveAiResult.skillGaps.length > 0
    ? liveAiResult.skillGaps.map((s) => ({ name: s, isMatched: false }))
    : profileMissing;

  const handleRunLiveAiAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const jobDescPayload = `${job.title} at ${job.company}.\nRole Category: ${job.roleCategory}\nLocation: ${job.location}\nKey Requirements: ${job.skills.map((s) => s.name).join(', ')}\n\nJob Description:\n${job.description}\n\nResponsibilities:\n${job.responsibilities ? job.responsibilities.join('\n') : ''}\n\nQualifications:\n${job.qualifications ? job.qualifications.join('\n') : ''}`;

      const res = await resumeApi.analyzeResume({
        jobDescription: jobDescPayload,
      });

      if (res && typeof res.atsScore === 'number') {
        setLiveAiResult(res);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.detail || err?.message || 'Could not run live AI match. Please upload your resume in Resume AI first.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleModalClose = () => {
    setLiveAiResult(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Resume & Job Match Analysis"
      subtitle={`Detailed competency alignment for ${job.title} @ ${job.company}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Source Badge Bar */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#56687A] font-medium">Match Calculation Source:</span>
            {isRealAi ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[11px]">
                <Cpu className="w-3 h-3 text-purple-600" />
                Live Groq LLM (Your Resume PDF)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E8F3FF] text-[#0A66C2] border border-[#d0e6fc] font-semibold text-[11px]">
                <FileText className="w-3 h-3 text-[#0A66C2]" />
                Profile Verified Competency Rubric
              </span>
            )}
          </div>

          {!isRealAi && (
            <Button
              size="xs"
              variant="outline"
              disabled={isAnalyzing}
              onClick={handleRunLiveAiAnalysis}
              className="text-[11px] text-brand-600 border-brand-300 hover:bg-brand-50 font-semibold"
              icon={isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin text-brand-600" /> : <Sparkles className="w-3 h-3 text-brand-600" />}
            >
              {isAnalyzing ? 'Analyzing via Groq...' : '⚡ Analyze with My Uploaded Resume'}
            </Button>
          )}
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
            <span>{errorMessage}</span>
            <Link to="/resume" onClick={handleModalClose} className="text-amber-900 underline font-semibold ml-2">
              Upload in Resume AI &rarr;
            </Link>
          </div>
        )}

        {/* Compatibility Dial Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between transition ${isRealAi ? 'bg-purple-50/70 border-purple-200' : 'bg-[#E8F3FF] border-[#d0e6fc]'}`}>
          <div className="space-y-1">
            <span className={`text-xs font-semibold ${isRealAi ? 'text-purple-700' : 'text-[#0A66C2]'}`}>
              {isRealAi ? 'Deep Groq AI Resume ATS Score' : 'Overall Match Probability'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#1D2226] font-mono">{displayScore}%</span>
              <span className="text-xs font-semibold text-emerald-700">
                {displayScore >= 90 ? 'Strong Alignment' : displayScore >= 80 ? 'Good Match' : 'Moderate Match'}
              </span>
            </div>
            <p className="text-[11px] text-[#56687A]">
              {isRealAi
                ? `Live Groq ATS evaluation comparing your uploaded resume text against ${job.title} specifications.`
                : `Your verified profile satisfies ${profileMatched.length} of ${job.skills.length} core technical requirements.`}
            </p>
          </div>

          <div className={`w-16 h-16 rounded-2xl bg-white border flex items-center justify-center font-extrabold text-lg shadow-sm ${isRealAi ? 'text-purple-700 border-purple-200' : 'text-[#0A66C2] border-[#d0e6fc]'}`}>
            {displayScore}%
          </div>
        </div>

        {/* Two-Column Comparison: Matched vs Missing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Matched */}
          <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Matched Competencies ({matchedList.length})</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {matchedList.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9D9D9] text-xs shadow-xs"
                >
                  <span className="text-[#1D2226] font-semibold">{m.name}</span>
                  <Badge variant="success" size="sm">
                    Verified ✓
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Missing */}
          <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
              <AlertTriangle className="w-4 h-4" />
              <span>Missing / Gap Competencies ({missingList.length})</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {missingList.length === 0 ? (
                <p className="text-xs text-[#788896] italic">No missing competencies detected!</p>
              ) : (
                missingList.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9D9D9] text-xs shadow-xs"
                  >
                    <span className="text-[#1D2226]">{m.name}</span>
                    <Link
                      to="/learning"
                      onClick={handleModalClose}
                      className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5"
                    >
                      Learn in Hub <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations Box */}
        <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D2226]">
            <Sparkles className="w-4 h-4 text-[#0A66C2]" />
            <span>AI Resume Tailoring Advice</span>
          </div>
          {isRealAi && liveAiResult?.recommendations && liveAiResult.recommendations.length > 0 ? (
            <ul className="text-xs text-[#38434F] space-y-1 list-disc pl-4">
              {liveAiResult.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#38434F] leading-relaxed">
              Highlight your experience with <span className="text-[#0A66C2] font-semibold">{matchedList.map((m) => m.name).join(', ')}</span> in your project summaries. If applying today, mention familiarity with <span className="text-[#8A6100] font-semibold">{missingList.map((m) => m.name).join(', ')}</span> in your cover letter.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E8E8]">
          <Button size="sm" variant="ghost" onClick={handleModalClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              onApply(job);
              handleModalClose();
            }}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Apply & Track Opportunity
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default JobMatchModal;
