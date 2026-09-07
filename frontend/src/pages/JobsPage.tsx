import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { JobCard } from '../components/jobs/JobCard';
import { JobDetailsPanel } from '../components/jobs/JobDetailsPanel';
import { JobMatchModal } from '../components/jobs/JobMatchModal';
import { JobFilters } from '../components/jobs/JobFilters';
import { JobItem, JobFilterState, Application } from '../types';
import {
  Building2,
  Sparkles,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Search,
  UserCheck,
} from 'lucide-react';

import { jobApi } from '../api/jobApi';
import { applicationApi } from '../api/applicationApi';
import { companyApi } from '../api/companyApi';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [matchAnalysisJob, setMatchAnalysisJob] = useState<JobItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [applications, setApplications] = useState<Application[]>([]);

  // Load real jobs and user applications from backend on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [jobsData, appsData] = await Promise.all([
          jobApi.getJobs(),
          applicationApi.getApplications(),
        ]);
        if (isMounted) {
          setJobs(jobsData || []);
          setApplications(appsData || []);
        }
      } catch (err) {
        console.error('Failed to load jobs data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    const handleAppUpdate = () => {
      applicationApi
        .getApplications()
        .then((apps) => {
          if (isMounted && apps) setApplications(apps);
        })
        .catch(() => {});
    };

    window.addEventListener('careerx_applications_updated', handleAppUpdate);
    window.addEventListener('storage', handleAppUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('careerx_applications_updated', handleAppUpdate);
      window.removeEventListener('storage', handleAppUpdate);
    };
  }, []);

  // Map job keys to corresponding user application
  const jobApplicationMap = useMemo(() => {
    const map = new Map<string, Application>();
    applications.forEach((app) => {
      const key = `${app.company.toLowerCase().trim()}::${app.role.toLowerCase().trim()}`;
      map.set(key, app);
    });
    return map;
  }, [applications]);

  // Discover more jobs via Groq AI
  const handleDiscoverMoreJobs = async () => {
    setIsDiscovering(true);
    try {
      const newComps = await companyApi.discoverWithAi({
        query: filters.search || (filters.role !== 'All' ? filters.role : 'Modern High Growth Tech Companies'),
        count: 3,
      });
      if (newComps && newComps.length > 0) {
        const refreshedJobs = await jobApi.getJobs();
        setJobs(refreshedJobs);
        setToastMessage(`⚡ Groq AI synthesized ${newComps.length} new tech partners & open engineering roles!`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err: any) {
      setToastMessage(`Error: ${err?.message || 'Could not fetch live jobs'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Filter State
  const [filters, setFilters] = useState<JobFilterState>({
    search: '',
    role: 'All',
    location: 'All',
    experience: 'All',
    skill: 'All',
    jobType: 'All',
    workType: 'All',
    sortBy: 'match',
  });

  // Derived filter options from dataset
  const availableRoles = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.roleCategory))).filter(Boolean);
  }, [jobs]);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.location))).filter(Boolean);
  }, [jobs]);

  const availableSkills = useMemo(() => {
    const all = jobs.flatMap((j) => j.skills.map((s) => s.name));
    return Array.from(new Set(all)).sort();
  }, [jobs]);

  // Filtering & Sorting
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Search
        const q = filters.search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q) ||
          job.skills.some((s) => s.name.toLowerCase().includes(q)) ||
          job.description.toLowerCase().includes(q);

        // Role
        const matchesRole = filters.role === 'All' || job.roleCategory === filters.role;

        // Location
        const matchesLocation = filters.location === 'All' || job.location === filters.location;

        // Experience
        const matchesExperience =
          filters.experience === 'All' || job.experienceLevel === filters.experience;

        // Skill
        const matchesSkill =
          filters.skill === 'All' || job.skills.some((s) => s.name === filters.skill);

        // Job Type
        const matchesJobType = filters.jobType === 'All' || job.jobType === filters.jobType;

        // Work Type
        const matchesWorkType = filters.workType === 'All' || job.workType === filters.workType;

        return (
          matchesSearch &&
          matchesRole &&
          matchesLocation &&
          matchesExperience &&
          matchesSkill &&
          matchesJobType &&
          matchesWorkType
        );
      })
      .sort((a, b) => {
        if (filters.sortBy === 'match') {
          return b.matchScore - a.matchScore;
        }
        if (filters.sortBy === 'newest') {
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        }
        if (filters.sortBy === 'salary') {
          return b.salaryRange.localeCompare(a.salaryRange);
        }
        return 0;
      });
  }, [jobs, filters]);

  // Handle Application Preparation Record
  const handleApply = async (job: JobItem) => {
    const jobKey = `${job.company.toLowerCase().trim()}::${job.title.toLowerCase().trim()}`;
    const existingApp = jobApplicationMap.get(jobKey);

    if (existingApp) {
      setToastMessage(`ℹ️ You already have an active application (${existingApp.status}) for ${job.title} at ${job.company}.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 14);

    const newApp: Application = {
      id: `app-from-job-${Date.now()}`,
      company: job.company,
      role: job.title,
      companyName: job.company,
      roleTitle: job.title,
      location: job.location,
      jobUrl: job.jobUrl,
      appliedDate: new Date().toISOString().slice(0, 10),
      deadline: deadlineDate.toISOString().slice(0, 10),
      deadlineDate: deadlineDate.toISOString().slice(0, 10),
      status: 'Applied',
      priority: job.matchScore >= 90 ? 'High' : 'Medium',
      notes: `Applied via CareerX Marketplace. Verified ${job.skills.map((s) => s.name).join(', ')} match.`,
      resume: 'Candidate_Resume.pdf',
      matchScore: job.matchScore,
      salaryRange: job.salaryRange,
      tags: job.skills.map((s) => s.name),
    };

    try {
      await applicationApi.createApplication(newApp);
    } catch {
      // Offline fallback
    }

    setApplications((prev) => [newApp, ...prev.filter((a) => !(a.company === job.company && a.role === job.title))]);
    window.dispatchEvent(new Event('careerx_applications_updated'));
    setToastMessage(`🎉 Applied successfully to ${job.title} at ${job.company}! Added to your Application Tracker.`);

    // Auto-dismiss toast after 4 seconds
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'All',
      location: 'All',
      experience: 'All',
      skill: 'All',
      jobType: 'All',
      workType: 'All',
      sortBy: 'match',
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Curated Engineering Opportunities"
        description="Discover software engineering roles and internships matching your verified technical profile."
        badge={
          <Badge variant="brand" size="sm">
            {jobs.length} Verified Roles
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isDiscovering}
              icon={<Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isDiscovering ? 'animate-spin' : ''}`} />}
              onClick={handleDiscoverMoreJobs}
            >
              {isDiscovering ? 'Discovering...' : 'Discover with Groq AI'}
            </Button>
            <Link to="/recruiter">
              <Button size="sm" variant="outline" icon={<UserCheck className="w-3.5 h-3.5 text-brand-400" />}>
                Recruiter Discovery
              </Button>
            </Link>
            <Link to="/applications">
              <Button size="sm" variant="primary" icon={<Briefcase className="w-3.5 h-3.5" />}>
                Application Tracker
              </Button>
            </Link>
          </div>
        }
      />

      {/* Preparation Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link to="/applications" className="font-semibold text-white underline text-xs flex items-center gap-1 flex-shrink-0">
            View Tracker <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Quick Marketplace Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-[#788896]">Total Positions</span>
            <p className="text-xl font-bold text-[#1D2226] font-mono">{jobs.length}</p>
          </div>
          <Building2 className="w-4 h-4 text-[#788896]" />
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-emerald-700 font-semibold">High Match (&gt;90%)</span>
            <p className="text-xl font-bold text-emerald-700 font-mono">
              {jobs.filter((j) => j.matchScore >= 90).length} Roles
            </p>
          </div>
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-[#0A66C2] font-semibold">Remote Available</span>
            <p className="text-xl font-bold text-[#0A66C2] font-mono">
              {jobs.filter((j) => j.workType === 'Remote').length}
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-[#0A66C2]" />
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-[#8A6100] font-semibold">Internships</span>
            <p className="text-xl font-bold text-[#8A6100] font-mono">
              {jobs.filter((j) => j.jobType === 'Internship').length}
            </p>
          </div>
          <Briefcase className="w-4 h-4 text-amber-500" />
        </div>
      </div>

      {/* Filter Component */}
      <JobFilters
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        availableRoles={availableRoles}
        availableLocations={availableLocations}
        availableSkills={availableSkills}
        totalResults={filteredJobs.length}
      />

      {/* Job Cards Grid (Laptop optimized 1366px+) */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
          <p className="text-sm font-semibold text-[#1D2226]">No jobs match your filter criteria</p>
          <p className="text-xs text-[#56687A]">Try adjusting your skill, location, or workplace filters</p>
          <Button size="xs" variant="outline" onClick={resetFilters}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredJobs.map((job) => {
            const key = `${job.company.toLowerCase().trim()}::${job.title.toLowerCase().trim()}`;
            const trackedApp = jobApplicationMap.get(key);
            return (
              <JobCard
                key={job.id}
                job={job}
                isApplied={Boolean(trackedApp)}
                applicationStatus={trackedApp?.status}
                onView={(j) => setSelectedJob(j)}
                onApply={handleApply}
                onAnalyzeMatch={(j) => setMatchAnalysisJob(j)}
              />
            );
          })}
        </div>
      )}

      {/* Job Details Slide-over Panel */}
      <JobDetailsPanel
        job={selectedJob}
        isOpen={Boolean(selectedJob)}
        isApplied={
          selectedJob
            ? Boolean(
                jobApplicationMap.get(
                  `${selectedJob.company.toLowerCase().trim()}::${selectedJob.title.toLowerCase().trim()}`
                )
              )
            : false
        }
        onClose={() => setSelectedJob(null)}
        onApply={handleApply}
        onAnalyzeMatch={(j) => {
          setSelectedJob(null);
          setMatchAnalysisJob(j);
        }}
      />

      {/* In-Depth Match Analysis Modal */}
      <JobMatchModal
        job={matchAnalysisJob}
        isOpen={Boolean(matchAnalysisJob)}
        onClose={() => setMatchAnalysisJob(null)}
        onApply={handleApply}
      />
    </div>
  );
};

export default JobsPage;
