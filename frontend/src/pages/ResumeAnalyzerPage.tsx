import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CircularAtsGauge } from '../components/resume/CircularAtsGauge';
import { ResumeUploadZone, ResumeItem } from '../components/resume/ResumeUploadZone';
import { AtsPillars, PillarMetric } from '../components/resume/AtsPillars';
import { AiBulletOptimizer } from '../components/resume/AiBulletOptimizer';
import { resumeApi, ResumeAnalysisResult, BulletImprovement } from '../api/resumeApi';
import { useAuth } from '../context/AuthContext';
import { sanitizeResumeStorage } from '../utils/userStorage';
import {
  FileSearch,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  Target,
  Code2,
  GraduationCap,
  Layout,
  Briefcase,
  Terminal,
  Key,
  X,
  Zap,
  UploadCloud,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResumeAnalyzerPage: React.FC = () => {
  const { user, token, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'keywords' | 'skills' | 'experience' | 'projects' | 'education' | 'formatting'
  >('overview');

  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);

  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize and refetch data strictly when the authenticated user changes
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    sanitizeResumeStorage();

    const loadUserData = async () => {
      if (!isAuthenticated || !user) {
        if (isMounted) {
          setResumes([]);
          setActiveResumeId('');
          setAnalysis(null);
          setIsLoadingResumes(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingResumes(true);
        setResumes([]);
        setActiveResumeId('');
        setAnalysis(null);
        setAnalysisError(null);
        setUploadSuccessMessage(null);
      }

      try {
        const userResumes = await resumeApi.listResumes(abortController.signal);
        if (!isMounted || abortController.signal.aborted) return;

        if (userResumes && userResumes.length > 0) {
          const mapped: ResumeItem[] = userResumes.map((r) => ({
            id: r.id,
            name: r.filename || r.name || 'Resume.pdf',
            format: ((r.filename || r.name || '').toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF') as 'PDF' | 'DOCX',
            size: r.size || '1.5 MB',
            uploadDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent',
            atsScore: r.atsScore || 0,
            isActive: Boolean(r.isActive),
          }));

          const activeItem = mapped.find((r) => r.isActive) || mapped[0];
          mapped.forEach((r) => {
            r.isActive = r.id === activeItem.id;
          });

          setResumes(mapped);
          setActiveResumeId(activeItem.id);

          // Fetch analysis strictly for the authenticated user's active resume
          const activeAnalysis = await resumeApi.getResumeAnalysisByResumeId(activeItem.id, abortController.signal);
          if (isMounted && !abortController.signal.aborted) {
            if (activeAnalysis) {
              setAnalysis(activeAnalysis);
            } else {
              setAnalysis(null);
            }
          }
        } else {
          if (isMounted && !abortController.signal.aborted) {
            setResumes([]);
            setActiveResumeId('');
            setAnalysis(null);
          }
        }
      } catch (err: unknown) {
        if (isMounted && !abortController.signal.aborted) {
          console.error('Failed to load user resume library:', err);
          setResumes([]);
          setActiveResumeId('');
          setAnalysis(null);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoadingResumes(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id, token, isAuthenticated]);

  const activeResume = resumes.find((r) => r.id === activeResumeId);

  // Handler for uploading new resume file
  const handleUploadNew = async (file: File) => {
    if (!isAuthenticated || !token) {
      setAnalysisError('Please sign in to upload and analyze your resume with Groq AI.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setUploadSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload and trigger parse on backend
      const uploaded = await resumeApi.uploadResume(formData);

      // Fetch the generated AI analysis for this uploaded resume
      let newAnalysis = await resumeApi.getResumeAnalysisByResumeId(uploaded.id);
      if (!newAnalysis) {
        newAnalysis = await resumeApi.analyzeResume({
          resumeId: uploaded.id,
        });
      }

      setAnalysis(newAnalysis);

      const newResume: ResumeItem = {
        id: uploaded.id,
        name: uploaded.filename || file.name,
        format: (uploaded.filename || file.name).toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
        size: uploaded.size || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: 'Just now',
        atsScore: newAnalysis?.atsScore || uploaded.atsScore || 0,
        isActive: true,
      };

      setResumes((prev) => [newResume, ...prev.map((r) => ({ ...r, isActive: false }))]);
      setActiveResumeId(newResume.id);
      setUploadSuccessMessage(`"${newResume.name}" uploaded and analyzed successfully with Groq AI!`);
      setTimeout(() => setUploadSuccessMessage(null), 5000);
    } catch (err: any) {
      let msg = 'Resume upload & analysis failed.';
      if (err?.response?.status === 401) {
        msg = 'Your session has expired or you are not signed in. Please sign in to analyze your resume.';
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for switching active resume
  const handleSelectResume = async (id: string) => {
    if (id === activeResumeId && analysis) return;

    setActiveResumeId(id);
    setResumes((prev) => prev.map((r) => ({ ...r, isActive: r.id === id })));
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      await resumeApi.setActiveResume(id);
      const resumeAnalysis = await resumeApi.getResumeAnalysisByResumeId(id);
      if (resumeAnalysis) {
        setAnalysis(resumeAnalysis);
      } else {
        // Trigger fresh analysis if not yet generated
        const fresh = await resumeApi.analyzeResume({
          resumeId: id,
        });
        if (fresh) {
          setAnalysis(fresh);
          setResumes((prev) =>
            prev.map((r) => (r.id === id ? { ...r, atsScore: fresh.atsScore } : r))
          );
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not fetch analysis for selected resume.';
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for deleting a resume
  const handleDeleteResume = async (id: string) => {
    try {
      await resumeApi.deleteResume(id);
    } catch (e) {
      console.warn('Error deleting resume on backend:', e);
    }

    const remaining = resumes.filter((r) => r.id !== id);
    setResumes(remaining);

    if (activeResumeId === id) {
      if (remaining.length > 0) {
        const nextResume = remaining[0];
        setActiveResumeId(nextResume.id);
        setResumes((prev) => prev.map((r) => ({ ...r, isActive: r.id === nextResume.id })));
        setIsAnalyzing(true);
        try {
          await resumeApi.setActiveResume(nextResume.id);
          const nextAnalysis = await resumeApi.getResumeAnalysisByResumeId(nextResume.id);
          setAnalysis(nextAnalysis);
        } catch {
          setAnalysis(null);
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        setActiveResumeId('');
        setAnalysis(null);
      }
    }
  };

  // Handler for re-triggering AI analysis
  const handleTriggerAnalysis = async () => {
    if (!activeResumeId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await resumeApi.analyzeResume({
        resumeId: activeResumeId,
      });
      setAnalysis(result);
      // Update score in resume list
      setResumes((prev) =>
        prev.map((r) => (r.id === activeResumeId ? { ...r, atsScore: result.atsScore } : r))
      );
      setUploadSuccessMessage('Resume re-analyzed successfully!');
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI analysis failed.';
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Extract structured properties from analysis
  const pillars: PillarMetric[] = analysis?.pillars && analysis.pillars.length > 0
    ? analysis.pillars
    : [
        {
          title: 'Keywords & Hard Skills',
          weight: '35% weight',
          score: analysis?.atsBreakdown?.keywordsScore || 80,
          status: 'optimal',
          summary: 'Technical skills and taxonomy match evaluation.',
        },
        {
          title: 'Impact & Metrics',
          weight: '30% weight',
          score: analysis?.atsBreakdown?.impactScore || 75,
          status: 'good',
          summary: 'Quantitative performance indicators and business metrics.',
        },
        {
          title: 'Formatting & Readability',
          weight: '20% weight',
          score: analysis?.atsBreakdown?.formattingScore || 85,
          status: 'optimal',
          summary: 'Single-column structure and standard header parsing.',
        },
        {
          title: 'Section Completeness',
          weight: '15% weight',
          score: analysis?.atsBreakdown?.completenessScore || 80,
          status: 'optimal',
          summary: 'Experience, projects, education, and contact headers validated.',
        },
      ];

  const strengths = analysis?.strengths || [];
  const weaknesses = analysis?.weaknesses || analysis?.optimizationAreas || [];
  const bulletImprovements: BulletImprovement[] = analysis?.bulletImprovements || analysis?.experienceRewrites || [];

  const missingKeywords = (analysis?.missingKeywords || analysis?.keywords || []).map((k) => {
    if (typeof k === 'string') {
      return { name: k, priority: 'High', category: 'Technical Competency' };
    }
    return {
      name: k.name || 'Keyword',
      priority: k.priority || 'High',
      category: k.category || 'Technical',
    };
  });

  const extractedSkills = analysis?.extractedSkills || {};

  return (
    <div className="space-y-5">
      {/* Hidden file input for header/empty state trigger */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadNew(e.target.files[0]);
          }
        }}
      />

      {/* Top Page Header */}
      <PageHeader
        title="AI Resume Analysis & ATS Optimizer"
        description="Real-time Groq LLM screening diagnostics, STAR bullet point enhancements, and semantic keyword extraction."
        badge={
          <Badge variant="brand" size="sm" className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            Groq Llama 3.3 Engine
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/jobs">
              <Button size="sm" variant="outline" icon={<Briefcase className="w-3.5 h-3.5 text-brand-400" />}>
                View Matching Jobs
              </Button>
            </Link>
            <Button
              size="sm"
              variant="primary"
              loading={isAnalyzing}
              disabled={resumes.length === 0 || !activeResumeId || isAnalyzing}
              onClick={handleTriggerAnalysis}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {isAnalyzing ? 'Analyzing with Groq...' : 'Analyze Resume'}
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {analysisError && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] border-l-4 border-l-[#DC2626] text-xs text-[#991B1B] flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
            <span>{analysisError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAnalysisError(null)}
            className="text-xs font-semibold text-[#991B1B] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Alert */}
      {uploadSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Skeletons State */}
      {isLoadingResumes ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm animate-pulse">
              <div className="h-4 bg-[#E8E8E8] rounded w-1/3" />
              <div className="h-32 bg-[#F3F6F8] rounded-2xl" />
              <div className="space-y-2">
                <div className="h-4 bg-[#E8E8E8] rounded w-1/2" />
                <div className="h-12 bg-[#F3F6F8] rounded-xl" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-6 bg-white border border-[#D9D9D9] space-y-6 shadow-sm animate-pulse">
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 rounded-full bg-[#F3F6F8]" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-[#E8E8E8] rounded w-1/2" />
                  <div className="h-3.5 bg-[#F3F6F8] rounded w-3/4" />
                  <div className="h-3 bg-[#F3F6F8] rounded w-1/3" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E8E8E8]">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-[#F3F6F8] rounded-xl" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Main 2-Column Responsive Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Resume Upload & Library */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
                <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
                  Active Document
                </span>
                <span className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {analysis?.isAiGenerated ? 'Groq AI Analyzed' : resumes.length > 0 ? 'Verified Upload' : 'No Resume'}
                </span>
              </div>

              {/* Upload Zone & Resume Library */}
              <ResumeUploadZone
                resumes={resumes}
                activeResumeId={activeResumeId}
                onSelectResume={handleSelectResume}
                onUploadNew={handleUploadNew}
                onDeleteResume={handleDeleteResume}
                isAnalyzing={isAnalyzing}
                onTriggerAnalysis={handleTriggerAnalysis}
              />
            </Card>

            {/* AI Screening Engine Legend */}
            <Card className="p-3.5 bg-[#F3F6F8] border border-[#E8E8E8] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-[#788896] block">
                  Groq AI Screening Engine
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Llama 3.3 70B
                </span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-[#38434F]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
                  <span className="font-semibold text-[#1D2226]">Verified Document Text:</span>
                  <span className="text-[#56687A]">Parsed directly from your authenticated resume.</span>
                </div>
                <div className="flex items-center gap-2 text-[#38434F]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2] flex-shrink-0" />
                  <span className="font-semibold text-[#0A66C2]">✨ Groq Real-Time Scorer:</span>
                  <span className="text-[#56687A]">Live ATS scoring, keyword extraction, and STAR bullet optimization.</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: AI Analysis Dashboard or Empty State */}
          <div className="lg:col-span-8 space-y-4">
            {resumes.length === 0 ? (
              /* EMPTY LIBRARY STATE */
              <Card className="p-8 bg-white border border-[#D9D9D9] shadow-sm text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2] shadow-sm">
                  <FileText className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-bold text-[#1D2226]">
                    No Resume Uploaded for ATS Screening
                  </h3>
                  <p className="text-xs text-[#56687A] leading-relaxed">
                    Upload your resume in PDF or DOCX format to receive real-time Groq LLM scoring, STAR bullet point enhancements, and keyword extraction tailored to your profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
                  <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1D2226]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Groq ATS Rubric Scoring</span>
                    </div>
                    <p className="text-[11px] text-[#56687A]">
                      Four-pillar diagnostic evaluating keywords, impact metrics, formatting, and completeness.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1D2226]">
                      <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>STAR Bullet Enhancements</span>
                    </div>
                    <p className="text-[11px] text-[#56687A]">
                      AI rewrites weak experience bullets into high-impact metric statements.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  {!isAuthenticated ? (
                    <Link to="/login">
                      <Button
                        variant="primary"
                        size="md"
                        icon={<Key className="w-4 h-4" />}
                      >
                        Sign In to Upload & Analyze Resume
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => hiddenFileInputRef.current?.click()}
                      icon={<UploadCloud className="w-4 h-4" />}
                    >
                      Upload Resume to Begin Analysis
                    </Button>
                  )}
                </div>
              </Card>
            ) : isAnalyzing && !analysis ? (
              /* ANALYZING STATE */
              <Card className="p-12 bg-white border border-[#D9D9D9] shadow-sm text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2] animate-spin">
                  <Loader2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#1D2226]">
                    Analyzing "{activeResume?.name}" with Groq AI...
                  </h3>
                  <p className="text-xs text-[#56687A]">
                    Extracting document text, identifying technical competencies, and evaluating ATS scoring rubrics.
                  </p>
                </div>
              </Card>
            ) : !analysis ? (
              /* READY TO ANALYZE STATE */
              <Card className="p-8 bg-white border border-[#D9D9D9] shadow-sm text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#1D2226]">
                    Resume Uploaded: {activeResume?.name}
                  </h3>
                  <p className="text-xs text-[#56687A]">
                    Click below to generate your comprehensive ATS diagnostics and STAR bullet recommendations.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  loading={isAnalyzing}
                  onClick={handleTriggerAnalysis}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Analyze Resume with Groq Engine
                </Button>
              </Card>
            ) : (
              /* FULL ANALYSIS DASHBOARD */
              <>
                {/* SECTION 1: ATS SCORE & PILLARS OVERVIEW */}
                <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-[#E8E8E8]">
                    <div className="flex items-center gap-5">
                      {/* Circular ATS Gauge */}
                      <CircularAtsGauge score={analysis.atsScore || activeResume?.atsScore || 0} size={118} strokeWidth={9} />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#1D2226] tracking-tight">
                            Algorithm Screening Evaluation
                          </h3>
                          <Badge variant="brand" size="sm">
                            {analysis.percentile ? `${analysis.percentile}th Percentile` : 'Top Candidate'}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#56687A] max-w-md leading-relaxed">
                          Evaluated against real-world parsing benchmarks from Workday, Greenhouse, and Lever.
                          Top candidate qualifications for {analysis.targetRole || analysis.targetProfile || 'Software Engineering roles'}.
                        </p>
                        <p className="text-[11px] text-[#788896] font-mono">
                          Target Profile: <span className="text-[#1D2226] font-semibold">{analysis.targetRole || analysis.targetProfile || 'Software Engineer'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Pillars Breakdown */}
                  <AtsPillars pillars={pillars} />
                </Card>

                {/* SECTION TABS: Overview, Keywords, Skills, Experience, Projects, Education, Formatting */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#E8E8E8]">
                  {[
                    { id: 'overview', label: 'Overview & Strength' },
                    { id: 'keywords', label: `Keywords & Gaps (${missingKeywords.length})` },
                    { id: 'skills', label: `Skill Extraction (${Object.values(extractedSkills).flat().length})` },
                    { id: 'experience', label: `Experience (${bulletImprovements.length} Rewrites)` },
                    { id: 'projects', label: 'Projects' },
                    { id: 'education', label: 'Education' },
                    { id: 'formatting', label: 'Formatting Health' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === tab.id
                          ? 'bg-[#0A66C2] text-white shadow-sm'
                          : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB CONTENT */}

                {/* TAB 1: OVERVIEW & RESUME STRENGTH */}
                {activeTab === 'overview' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Strengths & Weaknesses Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Strengths Card */}
                      <Card className="p-4 bg-[#F3F6F8] border border-[#E8E8E8] space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Resume Strengths ({strengths.length})</span>
                        </div>
                        {strengths.length === 0 ? (
                          <p className="text-xs text-[#788896]">No specific strengths recorded.</p>
                        ) : (
                          <ul className="space-y-2 text-xs text-[#38434F]">
                            {strengths.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Card>

                      {/* Weaknesses / Diagnostic Gaps Card */}
                      <Card className="p-4 bg-[#F3F6F8] border border-[#E8E8E8] space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
                          <AlertCircle className="w-4 h-4" />
                          <span>Areas for Optimization ({weaknesses.length})</span>
                        </div>
                        {weaknesses.length === 0 ? (
                          <p className="text-xs text-[#788896]">No critical weaknesses detected.</p>
                        ) : (
                          <ul className="space-y-2 text-xs text-[#38434F]">
                            {weaknesses.map((w, idx) => (
                              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                <AlertTriangle className="w-3.5 h-3.5 text-[#8A6100] flex-shrink-0 mt-0.5" />
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    </div>

                    {/* AI Bullet Enhancer Section Preview */}
                    {bulletImprovements.length > 0 && <AiBulletOptimizer bullets={bulletImprovements} />}

                    {/* Next Steps */}
                    <Card className="p-4 bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <h4 className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Next Steps: Close Identified Gaps & Match Opportunities
                        </h4>
                        <p className="text-[11px] text-[#56687A] mt-0.5">
                          Use your verified {analysis.atsScore}% ATS profile to diagnose competency gaps or evaluate job fit against live roles.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link to="/skills">
                          <Button size="xs" variant="outline" icon={<Target className="w-3 h-3 text-[#0A66C2]" />}>
                            Skill Gap Matrix
                          </Button>
                        </Link>
                        <Link to="/job-match">
                          <Button size="xs" variant="primary" icon={<ArrowRight className="w-3 h-3" />}>
                            Job Match Diagnostics
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  </div>
                )}

                {/* TAB 2: KEYWORDS & MISSING GAPS */}
                {activeTab === 'keywords' && (
                  <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                        <FileSearch className="w-4 h-4 text-[#0A66C2]" />
                        ATS Missing Keywords Analysis ({missingKeywords.length})
                      </h3>
                      <p className="text-[11px] text-[#56687A] mt-0.5">
                        High-priority keywords identified by Groq AI that will significantly increase your ATS match rate.
                      </p>
                    </div>

                    {missingKeywords.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>All target keywords found in resume! No critical keyword gaps identified.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {missingKeywords.map((kw, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="text-xs font-bold text-[#1D2226] font-mono">{kw.name}</p>
                              <span className="text-[10px] text-[#788896]">{kw.category}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant={kw.priority === 'High' ? 'danger' : kw.priority === 'Medium' ? 'warning' : 'neutral'}
                                size="sm"
                              >
                                {kw.priority}
                              </Badge>
                              <Link
                                to="/learning"
                                className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-semibold flex items-center gap-0.5"
                              >
                                Learn <ArrowRight className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* TAB 3: SKILL EXTRACTION */}
                {activeTab === 'skills' && (
                  <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-emerald-600" />
                          Verified Technical Skills Extracted ({Object.values(extractedSkills).flat().length})
                        </h3>
                        <p className="text-[11px] text-[#56687A] mt-0.5">
                          Extracted and categorised by Groq AI directly from your uploaded resume.
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        {Object.values(extractedSkills).flat().length} Skills Identified
                      </Badge>
                    </div>

                    {Object.keys(extractedSkills).length === 0 ? (
                      <p className="text-xs text-[#788896] p-4 text-center">No skills extracted.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(extractedSkills).map(([category, skillsList]) => (
                          <div key={category} className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-[#1D2226]">
                              <span>{category}</span>
                              <span className="text-[10px] font-mono text-[#788896]">{skillsList.length} skills</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {skillsList.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-0.5 rounded-md bg-white border border-[#D9D9D9] text-[#1D2226] text-xs font-mono flex items-center gap-1 shadow-xs"
                                >
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* TAB 4: EXPERIENCE (STAR REWRITES) */}
                {activeTab === 'experience' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {bulletImprovements.length === 0 ? (
                      <Card className="p-6 bg-white border border-[#D9D9D9] text-center text-xs text-[#788896]">
                        No bullet rewrites needed or available for this resume.
                      </Card>
                    ) : (
                      <AiBulletOptimizer bullets={bulletImprovements} />
                    )}
                  </div>
                )}

                {/* TAB 5: PROJECTS SECTION */}
                {activeTab === 'projects' && (
                  <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#0A66C2]" />
                        Projects Section Audit
                      </h3>
                      <p className="text-[11px] text-[#56687A] mt-0.5">
                        Evaluates project descriptions for architectural clarity, live URLs, and tech stack tagging.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {Array.isArray(analysis.projects) && analysis.projects.length > 0 ? (
                        analysis.projects.map((proj: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-[#1D2226]">{proj.name || proj.title || `Project #${idx + 1}`}</h4>
                              <Badge variant="brand" size="sm">{proj.status || 'Parsed'}</Badge>
                            </div>
                            <p className="text-xs text-[#38434F]">{proj.detail || proj.description || (typeof proj === 'string' ? proj : '')}</p>
                            {Array.isArray(proj.technologies) && proj.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {proj.technologies.map((t: string, tIdx: number) => (
                                  <span key={tIdx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#D9D9D9] text-[#56687A]">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-6 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] text-center text-xs text-[#56687A] space-y-1">
                          <p className="font-semibold text-[#1D2226]">No Specific Projects Section Detected</p>
                          <p className="text-[11px] text-[#788896]">
                            Your resume does not explicitly list distinct project titles. Adding a dedicated Projects section with quantifiable outcomes will improve ATS screening score.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* TAB 6: EDUCATION SECTION */}
                {activeTab === 'education' && (
                  <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 animate-in fade-in duration-150 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-[#0A66C2]" />
                          Education Section Audit
                        </h3>
                        <p className="text-[11px] text-[#56687A] mt-0.5">Accreditation and degree level validation.</p>
                      </div>
                      <Badge variant="success" size="sm">
                        {analysis.atsBreakdown?.completenessScore || 90}% Compliance
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {Array.isArray(analysis.education) && analysis.education.length > 0 ? (
                        analysis.education.map((edu: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-[#1D2226]">{edu.degree || edu.institution || `Education #${idx + 1}`}</h4>
                              <span className="text-xs font-mono font-bold text-emerald-700">{edu.status || 'Verified'}</span>
                            </div>
                            <p className="text-[11px] text-[#56687A]">{edu.detail || edu.institution || edu.field || ''}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] text-center text-xs text-[#56687A] space-y-1">
                          <p className="font-semibold text-[#1D2226]">No Education / Degree Section Detected</p>
                          <p className="text-[11px] text-[#788896]">
                            Your resume does not explicitly list accredited degree or certification headers.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* TAB 7: FORMATTING HEALTH */}
                {activeTab === 'formatting' && (
                  <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                          <Layout className="w-4 h-4 text-emerald-600" />
                          ATS Formatting & Readability Recommendations
                        </h3>
                        <p className="text-[11px] text-[#56687A] mt-0.5">
                          Structural compliance ensuring zero parser truncation across enterprise hiring platforms.
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        Score: {analysis.atsBreakdown?.formattingScore || 90}/100
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {Array.isArray(analysis.formattingRecommendations) && analysis.formattingRecommendations.length > 0 ? (
                        analysis.formattingRecommendations.map((rec: string, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-start gap-2.5 text-xs"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#0A66C2] flex-shrink-0 mt-0.5" />
                            <span className="text-[#38434F] leading-relaxed">{rec}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Document layout and formatting adhere to standard single-column ATS readability rules.</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ResumeAnalyzerPage;
