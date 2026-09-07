import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CompanyCard } from '../components/companies/CompanyCard';
import { CompanyDetailModal } from '../components/companies/CompanyDetailModal';
import { JobMatchModal } from '../components/jobs/JobMatchModal';
import { CompanyProfile } from '../types/company';
import { JobItem, Application } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  Sparkles,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../utils/cn';

import { companyApi } from '../api/companyApi';
import { applicationApi } from '../api/applicationApi';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [matchAnalysisJob, setMatchAnalysisJob] = useState<JobItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Load companies and user applications from backend on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      companyApi.getCompanies(),
      applicationApi.getApplications(),
    ])
      .then(([comps, apps]) => {
        if (!isMounted) return;
        setCompanies(comps || []);
        if (apps && apps.length > 0) {
          const appliedTitles = new Set(apps.map((a) => `${a.company.toLowerCase()}-${a.role.toLowerCase()}`));
          const ids = new Set<string>();
          (comps || []).forEach((c) => {
            (c.jobs || []).forEach((j) => {
              if (appliedTitles.has(`${j.company.toLowerCase()}-${j.title.toLowerCase()}`)) {
                ids.add(j.id);
              }
            });
          });
          setAppliedJobIds(ids);
        }
      })
      .catch((err) => {
        console.error('Failed to load companies data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // AI Discovery with Groq Engine
  const handleDiscoverAi = async (specificCompanyName?: string) => {
    setIsDiscovering(true);
    try {
      const targetQuery = specificCompanyName || searchQuery || undefined;
      const targetIndustry = !specificCompanyName && selectedIndustry !== 'All' ? selectedIndustry : undefined;

      const generated = await companyApi.discoverWithAi({
        companyName: specificCompanyName,
        industry: targetIndustry,
        query: targetQuery,
        count: specificCompanyName ? 1 : 3,
      });

      if (generated && generated.length > 0) {
        // Merge into state
        setCompanies((prev) => {
          const genIds = new Set(generated.map((g) => g.id));
          const updated = [...generated, ...prev.filter((p) => !genIds.has(p.id))];
          return updated;
        });

        const names = generated.map((g) => g.name).join(', ');
        setToastMessage(`⚡ Groq AI successfully researched real engineering intelligence for: ${names}!`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Groq AI company discovery failed.';
      setToastMessage(`Error: ${msg}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Follow Toggle
  const handleFollowToggle = async (companyId: string) => {
    try {
      const res = await companyApi.toggleFollowCompany(companyId);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? { ...c, isFollowing: res.isFollowing, followersCount: res.followersCount }
            : c
        )
      );
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany((prev) =>
          prev ? { ...prev, isFollowing: res.isFollowing, followersCount: res.followersCount } : null
        );
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  // Apply to Job
  const handleApplyJob = async (job: JobItem) => {
    try {
      const newApplication: Application = {
        id: `app-${Date.now()}`,
        company: job.company,
        role: job.title,
        location: job.location,
        appliedDate: new Date().toISOString().split('T')[0],
        deadline: '2026-09-30',
        status: 'Applied',
        priority: 'High',
        matchScore: job.matchScore,
        salaryRange: job.salaryRange,
        tags: (job.skills || []).slice(0, 3).map((s) => s.name),
        notes: `Applied directly via Company Spotlight for ${job.company}`,
      };

      await applicationApi.createApplication(newApplication);
      setAppliedJobIds((prev) => new Set([...prev, job.id]));
      window.dispatchEvent(new Event('careerx_applications_updated'));
      setToastMessage(`🎉 Successfully applied to ${job.title} at ${job.company}! Added to tracker.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to apply to job:', err);
    }
  };

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.headquarters.toLowerCase().includes(q) ||
        c.techStack.some((t) => t.toLowerCase().includes(q)) ||
        c.jobs.some((j) => j.title.toLowerCase().includes(q));

      const matchesIndustry =
        selectedIndustry === 'All' ||
        (selectedIndustry === 'AI & ML' && (c.industry.toLowerCase().includes('ai') || c.industry.toLowerCase().includes('machine learning') || c.industry.toLowerCase().includes('mlops'))) ||
        c.industry.toLowerCase().includes(selectedIndustry.toLowerCase());

      return matchesSearch && matchesIndustry;
    });
  }, [companies, searchQuery, selectedIndustry]);

  const totalJobs = useMemo(
    () => companies.reduce((acc, c) => acc + c.jobs.length, 0),
    [companies]
  );

  const followingCount = useMemo(
    () => companies.filter((c) => c.isFollowing).length,
    [companies]
  );

  const industriesList = ['All', 'AI & ML', 'Fintech', 'Developer Tools', 'Cloud Platform', 'Cyber Security'];

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-brand-950 border border-brand-500 text-white text-xs flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/applications"
            className="text-xs font-bold text-brand-300 hover:text-white underline ml-4 flex-shrink-0"
          >
            View Applications →
          </Link>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Partner Engineering Companies"
        description="Explore top engineering cultures, tech stacks, open engineering roles, and connect with technical recruiters."
        badge={
          <Badge variant="brand" size="sm">
            {companies.length} Hiring Partners
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              loading={isDiscovering}
              onClick={() => handleDiscoverAi()}
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            >
              {isDiscovering ? 'Groq AI Researching...' : 'Discover with Groq AI'}
            </Button>
            <Link to="/jobs">
              <Button size="sm" variant="outline" icon={<Briefcase className="w-3.5 h-3.5 text-brand-400" />}>
                All Marketplace Jobs
              </Button>
            </Link>
          </div>
        }
      />

      {/* Groq Live Discovery Prompt / Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-xs text-[#1D2226]">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2] flex-shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="font-bold text-[#1D2226] flex items-center gap-1.5">
              <span>Groq Live Company & Jobs Intelligence Engine</span>
              <Badge variant="brand" size="sm">Live Llama 3.3</Badge>
            </p>
            <p className="text-[11px] text-[#56687A]">
              {searchQuery.trim()
                ? `Synthesize real-world engineering dossier, stack & open roles for "${searchQuery.trim()}".`
                : selectedIndustry !== 'All'
                ? `Fetch live hiring partners and technical pipelines in ${selectedIndustry}.`
                : 'Fetch and synthesize live Tier-1 engineering cultures, tech stacks, and active openings.'}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          loading={isDiscovering}
          onClick={() => handleDiscoverAi(searchQuery.trim() || undefined)}
          icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
          className="flex-shrink-0"
        >
          {isDiscovering
            ? 'Researching...'
            : searchQuery.trim()
            ? `Research "${searchQuery.trim()}" with Groq`
            : `Fetch ${selectedIndustry !== 'All' ? selectedIndustry : 'Tech'} Companies via Groq`}
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP STATS BAR                                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Companies</span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">{companies.length}</p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Tier-1 Tech</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Open Engineering Roles</span>
          <p className="text-xl font-bold text-[#0A66C2] font-mono">{totalJobs} Roles</p>
          <span className="text-[10px] text-[#0A66C2] font-mono font-semibold">Active Pipelines</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Following</span>
          <p className="text-xl font-bold text-[#8A6100] font-mono">{followingCount}</p>
          <span className="text-[10px] text-[#8A6100] font-mono font-semibold">Instant Alerts</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Avg Profile Match</span>
          <p className="text-xl font-bold text-emerald-700 font-mono">91%</p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Based on ATS Resume</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & INDUSTRY FILTER BAR                                           */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleDiscoverAi(searchQuery.trim());
              }
            }}
            placeholder="Search company (or type 'Anthropic', 'OpenAI', 'Uber', 'Netflix' & press Enter)..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
          />
        </div>

        {/* Industry Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {industriesList.map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                selectedIndustry === ind
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPANIES CARDS GRID                                                   */}
      {/* ========================================================================= */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-white space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2]">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#1D2226]">No companies found matching your criteria</p>
          <p className="text-xs text-[#56687A] max-w-md mx-auto">
            Use Groq AI to instantly synthesize the real-world engineering dossier, production tech stack, and open jobs for this search.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              size="sm"
              variant="primary"
              loading={isDiscovering}
              onClick={() => handleDiscoverAi(searchQuery.trim() || undefined)}
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            >
              Research "{searchQuery || selectedIndustry}" with Groq AI
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedIndustry('All');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompanies.map((comp) => (
            <CompanyCard
              key={comp.id}
              company={comp}
              onFollowToggle={handleFollowToggle}
              onSelectCompany={setSelectedCompany}
            />
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMPANY DETAIL MODAL (About, Jobs, Posts, Employees)                   */}
      {/* ========================================================================= */}
      <CompanyDetailModal
        company={selectedCompany}
        isOpen={Boolean(selectedCompany)}
        onClose={() => setSelectedCompany(null)}
        onFollowToggle={handleFollowToggle}
        onApplyJob={handleApplyJob}
        onAnalyzeMatch={(job) => setMatchAnalysisJob(job)}
        appliedJobIds={appliedJobIds}
      />

      {/* ========================================================================= */}
      {/* 5. JOB MATCH MODAL (Analyze Match against Candidate Resume)               */}
      {/* ========================================================================= */}
      {matchAnalysisJob && (
        <JobMatchModal
          job={matchAnalysisJob}
          isOpen={Boolean(matchAnalysisJob)}
          onClose={() => setMatchAnalysisJob(null)}
          onApply={(job) => {
            handleApplyJob(job);
            setMatchAnalysisJob(null);
          }}
        />
      )}
    </div>
  );
};

export default CompaniesPage;

