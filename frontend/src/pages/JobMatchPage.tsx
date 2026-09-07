import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { JobItem } from '../types';
import { resumeApi, ResumeListItem } from '../api/resumeApi';
import { jobApi } from '../api/jobApi';
import { applicationApi } from '../api/applicationApi';
import { Link, useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  Check,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Briefcase,
  ArrowRight,
  BookOpen,
  Send,
  SlidersHorizontal,
  ChevronRight,
  Target,
  RefreshCw,
} from 'lucide-react';

export const JobMatchPage: React.FC = () => {
  const navigate = useNavigate();

  // Resume selection state
  const [userResumes, setUserResumes] = useState<ResumeListItem[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [customJobText, setCustomJobText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<{
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendations: string[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      jobApi.getJobs(),
      resumeApi.listResumes(),
    ]).then(([jobsData, resumesData]) => {
      if (!isMounted) return;
      if (jobsData && jobsData.length > 0) {
        setJobs(jobsData);
        setSelectedJobId(jobsData[0].id);
      }
      if (resumesData && resumesData.length > 0) {
        setUserResumes(resumesData);
        const active = resumesData.find((r) => r.isActive) || resumesData[0];
        setSelectedResume(active.filename || active.name || active.id);
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const currentJob: JobItem | null = jobs.find((j) => j.id === selectedJobId) || (jobs.length > 0 ? jobs[0] : null);

  const handleRunMatch = async () => {
    if (!selectedJobId) return;
    setIsAnalyzing(true);
    try {
      const res = await jobApi.getJobMatchAnalysis(selectedJobId);
      setMatchData(res);
    } catch (err) {
      console.error('Failed to run match calculation:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      handleRunMatch();
    }
  }, [selectedJobId]);

  const handleApply = async () => {
    if (!currentJob) return;

    try {
      await applicationApi.createApplication({
        id: `app-${Date.now()}`,
        company: currentJob.company,
        role: currentJob.title,
        location: currentJob.location,
        appliedDate: new Date().toISOString().split('T')[0],
        deadline: '2026-09-30',
        status: 'Applied',
        priority: (currentJob.matchScore || 80) >= 90 ? 'High' : 'Medium',
        matchScore: matchData ? matchData.matchScore : currentJob.matchScore,
        salaryRange: currentJob.salaryRange,
        tags: currentJob.skills.slice(0, 3).map((s) => s.name),
        notes: `Applied from Job Match Diagnostics with ${matchData ? matchData.matchScore : currentJob.matchScore}% compatibility score.`,
      });
      window.dispatchEvent(new Event('careerx_applications_updated'));
      setToastMessage(`🎉 Application submitted for ${currentJob.title} at ${currentJob.company}! Added to your Application Tracker.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to apply:', err);
    }
  };

  const overallScore = matchData ? matchData.matchScore : (currentJob ? currentJob.matchScore : 0);
  const matchedSkills = matchData ? matchData.matchedSkills : (currentJob ? currentJob.skills.filter((s) => s.isMatched).map((s) => s.name) : []);
  const missingSkills = matchData ? matchData.missingSkills : (currentJob ? currentJob.skills.filter((s) => !s.isMatched).map((s) => s.name) : []);
  const recommendations = matchData && matchData.recommendations.length > 0
    ? matchData.recommendations.map((text) => ({
        title: text,
        desc: 'Recommended skill acquisition to elevate your match score for this position.',
        action: 'Launch Module',
        link: '/learning',
      }))
    : [
        {
          title: 'Review Engineering Fundamentals',
          desc: 'Closing the missing skill gaps will elevate your match score.',
          action: 'Launch Learning',
          link: '/learning',
        },
      ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Resume-to-Job Match Analysis"
        description="Compare your active resume against target job requirements to detect matched, partial, and missing competencies."
        badge={
          <Badge variant="brand" size="sm">
            Neural Match v2.1
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/skills">
              <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-brand-400" />}>
                View Skill Gap Matrix
              </Button>
            </Link>
            <Link to="/jobs">
              <Button size="sm" variant="secondary" icon={<Briefcase className="w-3.5 h-3.5" />}>
                Browse More Jobs
              </Button>
            </Link>
          </div>
        }
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/applications"
            className="font-semibold text-emerald-800 underline text-xs flex items-center gap-1 flex-shrink-0"
          >
            Open Tracker <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INPUT CONFIGURATION: RESUME + TARGET JOB                               */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A66C2]" />
            Comparison Inputs
          </span>
          <button
            onClick={() => setIsCustomJob(!isCustomJob)}
            className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium transition"
          >
            {isCustomJob ? 'Select from Saved Jobs' : '+ Paste Custom Job Description'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: Select Candidate Resume */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0A66C2]" />
              1. Candidate Resume
            </label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              {userResumes.length > 0 ? (
                userResumes.map((r) => (
                  <option key={r.id} value={r.filename || r.name || r.id}>
                    {r.filename || r.name} {r.atsScore ? `(${r.atsScore}% ATS)` : ''} {r.isActive ? '• Active' : ''}
                  </option>
                ))
              ) : (
                <option value="">No resumes uploaded (Upload in Resume AI)</option>
              )}
            </select>
          </div>

          {/* Right: Select Job or Paste Custom */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              2. Target Opportunity
            </label>
            {isCustomJob ? (
              <textarea
                rows={2}
                value={customJobText}
                onChange={(e) => setCustomJobText(e.target.value)}
                placeholder="Paste the target job description or requirements here..."
                className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              />
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} @ {job.company} ({job.location})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="primary"
            loading={isAnalyzing}
            onClick={handleRunMatch}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {isAnalyzing ? 'Evaluating Semantics...' : 'Re-Calculate Compatibility'}
          </Button>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. OVERALL MATCH SCORE BANNER                                             */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#1D2226] font-mono tracking-tight">
              {overallScore}% Match
            </span>
            <Badge variant={overallScore >= 80 ? 'success' : overallScore >= 50 ? 'warning' : 'danger'} size="md">
              {overallScore >= 80 ? 'High Probability' : overallScore >= 50 ? 'Moderate Match' : 'Skill Gap Detected'}
            </Badge>
          </div>
          <p className="text-xs text-[#56687A]">
            Comparing <span className="text-[#0A66C2] font-semibold">{selectedResume || 'Candidate Profile'}</span> against{' '}
            <span className="text-[#1D2226] font-semibold">
              {currentJob ? `${currentJob.title} @ ${currentJob.company}` : 'Selected Opportunity'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/skills">
            <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-[#0A66C2]" />}>
              Skill Gap Matrix
            </Button>
          </Link>
          <Link to="/learning">
            <Button size="sm" variant="secondary" icon={<BookOpen className="w-3.5 h-3.5 text-[#0A66C2]" />}>
              Learn Missing Skills
            </Button>
          </Link>
          <Button
            size="sm"
            variant="primary"
            onClick={handleApply}
            disabled={!currentJob}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Apply to Role
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPETENCIES COMPARISON (Matched, Missing)                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MATCHED SKILLS */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Matched Skills ({matchedSkills.length})</span>
            </div>
            <Badge variant="success" size="sm">
              Verified
            </Badge>
          </div>

          <div className="space-y-2">
            {matchedSkills.length === 0 ? (
              <p className="text-xs text-[#788896] italic py-3 text-center">No verified matching skills found for this position.</p>
            ) : (
              matchedSkills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#E6F4EA] border border-[#c6ecd2] text-xs font-mono text-[#1D2226]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span className="font-semibold">{skill}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-sans">Full Match</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* MISSING SKILLS */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
              <AlertTriangle className="w-4 h-4" />
              <span>Missing Skills ({missingSkills.length})</span>
            </div>
            <Badge variant="warning" size="sm">
              Gaps
            </Badge>
          </div>

          <div className="space-y-2">
            {missingSkills.length === 0 ? (
              <p className="text-xs text-emerald-700 italic py-3 text-center">All required skills are covered!</p>
            ) : (
              missingSkills.map((item) => {
                const name = typeof item === 'string' ? item : (item as any).name;
                return (
                  <div
                    key={name}
                    className="p-2 rounded-xl bg-[#FFF4CC]/50 border border-[#ffe899] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A6100] font-bold">⚠</span>
                      <span className="text-[#1D2226] font-semibold">{name}</span>
                    </div>
                    <Link
                      to="/learning"
                      className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5"
                    >
                      Learn <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECOMMENDATIONS TO CLOSE THE GAP (Linked to Learning)                  */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Tailored AI Recommendations to Close the Gap
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Actionable steps to reach high compatibility before submitting your application.
            </p>
          </div>
          <Badge variant="brand" size="sm">
            {recommendations.length} Steps
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col justify-between space-y-3 group hover:border-[#0A66C2]/40 transition"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                  {rec.title}
                </h4>
                <p className="text-[11px] text-[#56687A] leading-relaxed">{rec.desc}</p>
              </div>

              <div className="pt-2 border-t border-[#E8E8E8] flex justify-end">
                <Link to={rec.link}>
                  <Button size="xs" variant="primary" className="text-[10px]">
                    {rec.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default JobMatchPage;
