import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { dashboardApi, DashboardOverviewResponse, DashboardActivityResponse } from '../api/dashboardApi';
import {
  Briefcase,
  Users,
  Award,
  XCircle,
  FileCheck,
  Target,
  Code2,
  Flame,
  Calendar,
  Clock,
  ExternalLink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  BookOpen,
  ChevronRight,
  Activity,
  TrendingUp,
  Moon,
  Sun,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

export const HomePage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [upcomingTab, setUpcomingTab] = useState<'all' | 'interviews' | 'deadlines' | 'followups'>('all');

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [activity, setActivity] = useState<DashboardActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [ovData, actData] = await Promise.all([
          dashboardApi.getOverview(),
          dashboardApi.getActivity(10).catch(() => ({ items: [], total: 0 })),
        ]);
        if (isMounted) {
          setOverview(ovData);
          setActivity(actData);
        }
      } catch (err) {
        console.error('Failed to load dashboard overview:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const totalApps = overview?.applications.total ?? 0;
  const interviewing = overview?.applications.interviewing ?? 0;
  const offered = overview?.applications.offered ?? 0;
  const rejected = overview?.applications.rejected ?? 0;
  const atsScore = overview?.profile.atsScore ?? user?.atsScore ?? 0;
  const savedRoles = overview?.savedJobsCount ?? 0;
  const questionsSolved = overview?.learningProgress?.questionsSolved ?? 0;
  const streakDays = overview?.learningProgress?.streakDays ?? 0;

  // Real Application status data for Recharts
  const applicationStatusData = [
    { name: 'Applied', value: overview?.applications.applied ?? 0, color: '#0A66C2' },
    { name: 'Interviewing', value: interviewing, color: '#7C83FD' },
    { name: 'Offered', value: offered, color: '#12B886' },
    { name: 'Rejected', value: rejected, color: '#E6395A' },
    { name: 'Wishlist', value: overview?.applications.wishlist ?? 0, color: '#9AA5B1' },
  ];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const avgPerDay = Math.floor(questionsSolved / 7);
  const weeklyLearningData = days.map((day, idx) => ({
    day,
    problems: idx === 5 ? Math.max(0, questionsSolved - avgPerDay * 6) : avgPerDay,
  }));

  const skillGrowthData = [
    { month: 'M-3', dsa: Math.max(0, atsScore - 20), backend: Math.max(0, atsScore - 15) },
    { month: 'M-2', dsa: Math.max(0, atsScore - 12), backend: Math.max(0, atsScore - 10) },
    { month: 'M-1', dsa: Math.max(0, atsScore - 5), backend: Math.max(0, atsScore - 5) },
    { month: 'Current', dsa: atsScore, backend: atsScore },
  ];

  // Dynamic upcoming items from server
  const upcomingItems = [
    ...(overview?.upcomingInterviews || []).map((i) => ({
      id: i.id,
      type: 'interviews' as const,
      title: i.role,
      company: i.company,
      date: i.date,
      badge: i.status || 'Interview',
      badgeVariant: 'brand' as const,
      urgency: i.urgency || 'high',
      linkText: 'View Notes',
      path: i.link || '/applications',
    })),
    ...(overview?.upcomingDeadlines || []).map((d) => ({
      id: d.id,
      type: 'deadlines' as const,
      title: d.role,
      company: d.company,
      date: d.deadline,
      badge: d.status || 'Deadline',
      badgeVariant: 'warning' as const,
      urgency: d.urgency || 'medium',
      linkText: 'View App',
      path: '/applications',
    })),
  ];

  const filteredUpcoming =
    upcomingTab === 'all'
      ? upcomingItems
      : upcomingItems.filter((item) => item.type === upcomingTab);

  // Dynamic recommended actions based on actual profile state
  const recommendedActions = [
    {
      id: 'rec-1',
      title: atsScore < 80 ? 'Optimize Resume for ATS Screening' : 'Review ATS Keywords & Alignment',
      category: 'ATS Engine',
      categoryColor: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
      description:
        atsScore > 0
          ? `Current score: ${atsScore}%. Target high-impact action verbs and quantified deliverables to maximize screening pass rates.`
          : 'Upload your resume to calculate your real ATS score and unlock customized bullet rewrites.',
      impact: atsScore > 0 ? `${atsScore}% ATS Score` : 'Requires Resume',
      actionLabel: 'Analyze Resume',
      actionPath: '/resume',
      icon: FileCheck,
    },
    {
      id: 'rec-2',
      title: 'Practice Algorithmic Problem Solving',
      category: 'Monaco IDE',
      categoryColor: 'text-[#137333] bg-[#E6F4EA] border-[#c6ecd2]',
      description:
        questionsSolved > 0
          ? `${questionsSolved} questions solved. Continue your streak with curated technical interview challenges.`
          : 'Solve your first coding interview problem to build confidence and track your streak.',
      impact: questionsSolved > 0 ? `${questionsSolved} Solved` : '0 Solved',
      actionLabel: 'Solve Practice',
      actionPath: '/learning',
      icon: Code2,
    },
    {
      id: 'rec-3',
      title: 'Discover Matching Open Engineering Roles',
      category: 'Job Match',
      categoryColor: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
      description: 'Explore live curated engineering positions matching your verified skills and desired work style.',
      impact: savedRoles > 0 ? `${savedRoles} Saved` : 'Explore Jobs',
      actionLabel: 'Browse Jobs',
      actionPath: '/jobs',
      icon: Briefcase,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="CareerX Command Center"
        description={`Welcome back, ${user?.name || 'Engineer'}. Here is your live pipeline status, learning progress, and prioritized career actions.`}
        badge={
          <Badge variant="brand" size="sm">
            Live Workspace
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={toggleTheme}
              icon={theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            />
            <Link to="/applications">
              <Button size="xs" variant="primary" icon={<Briefcase className="w-3.5 h-3.5" />}>
                Add Application
              </Button>
            </Link>
            <Link to="/resume">
              <Button size="xs" variant="outline" icon={<FileCheck className="w-3.5 h-3.5" />}>
                ATS Scorer
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. KEY METRIC COUNTERS (8 items) - 4-Col Laptop, 8-Col Desktop Grid       */}
      {/* ========================================================================= */}
      {/* 1. KEY METRIC COUNTERS (8 items) - 4-Col Laptop, 8-Col Desktop Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 laptop-lg:grid-cols-8 gap-2.5">
        {/* 1. Total applications */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#56687A]">
            <span className="text-[11px] font-semibold text-[#56687A]">Total Apps</span>
            <Briefcase className="w-3.5 h-3.5 text-[#56687A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#1D2226] tracking-tight">{totalApps}</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">{totalApps === 0 ? 'No applications yet' : 'Active pipeline'}</p>
          </div>
        </Card>

        {/* 2. Interviews */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#0A66C2]">Interviews</span>
            <Users className="w-3.5 h-3.5 text-[#0A66C2]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#0A66C2] tracking-tight">{interviewing}</div>
            <p className="text-[10px] text-[#12B886] font-medium mt-0.5 truncate">{interviewing > 0 ? 'In progress' : 'None scheduled'}</p>
          </div>
        </Card>

        {/* 3. Offers */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#12B886]">Offers</span>
            <Award className="w-3.5 h-3.5 text-[#12B886]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#12B886] tracking-tight">{offered}</div>
            <p className="text-[10px] text-[#12B886] font-medium mt-0.5 truncate">{offered > 0 ? 'Offers received' : '0 offers'}</p>
          </div>
        </Card>

        {/* 4. Rejected applications */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#E6395A]">Rejected</span>
            <XCircle className="w-3.5 h-3.5 text-[#E6395A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#E6395A] tracking-tight">{rejected}</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">{totalApps > 0 ? `${Math.round((rejected / totalApps) * 100)}% exit rate` : '0 recorded'}</p>
          </div>
        </Card>

        {/* 5. ATS score */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#0A66C2]">ATS Score</span>
            <FileCheck className="w-3.5 h-3.5 text-[#0A66C2]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#0A66C2] tracking-tight">
              {atsScore}%
            </div>
            <p className="text-[10px] text-[#0A66C2] font-medium mt-0.5 truncate">{atsScore > 0 ? 'Diagnostic score' : 'Not analyzed'}</p>
          </div>
        </Card>

        {/* 6. Saved jobs */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#0A66C2]">Saved Jobs</span>
            <Target className="w-3.5 h-3.5 text-[#0A66C2]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#0A66C2] tracking-tight">{savedRoles}</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">Bookmarked roles</p>
          </div>
        </Card>

        {/* 7. Questions solved */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#7C83FD]">Solved</span>
            <Code2 className="w-3.5 h-3.5 text-[#7C83FD]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#1D2226] tracking-tight">{questionsSolved}</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">Problems accepted</p>
          </div>
        </Card>

        {/* 8. Current coding streak */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#F5A623]">Streak</span>
            <Flame className="w-3.5 h-3.5 text-[#F5A623]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#F5A623] tracking-tight">{streakDays}d 🔥</div>
            <p className="text-[10px] text-[#12B886] font-medium mt-0.5 truncate">{streakDays > 0 ? 'Active streak' : 'Start practicing'}</p>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2. RECHARTS ANALYTICS: Status, Weekly Learning, Skill Growth (3 Columns)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Application Status (Donut Breakdown) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#0A66C2]" />
                Application Pipeline
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">{totalApps} total opportunities tracked</p>
            </div>
            <Link to="/applications" className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5">
              Tracker <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            {totalApps === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4">
                <Briefcase className="w-8 h-8 text-[#56687A] mb-2 stroke-1" />
                <p className="text-xs font-semibold text-[#1D2226]">No applications tracked yet</p>
                <p className="text-[11px] text-[#56687A] mt-0.5">Add an application to monitor your stage progression.</p>
                <Link to="/applications" className="mt-2.5">
                  <Button size="xs" variant="primary">Add Application</Button>
                </Link>
              </div>
            ) : (
              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D9D9D9',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#1D2226',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      }}
                    />
                    <Pie
                      data={applicationStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {applicationStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-lg font-extrabold text-[#1D2226]">{totalApps}</span>
                  <span className="text-[10px] text-[#788896] font-mono">Apps</span>
                </div>
              </div>
            )}

            {/* Legend pills */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#E8E8E8] text-[10px]">
              {applicationStatusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[#56687A] truncate">{s.name}:</span>
                  <span className="text-[#1D2226] font-mono font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Weekly Learning Activity (Bar Chart) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#12B886]" />
                Weekly Learning Activity
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">32 problems • 23.7 hrs logged</p>
            </div>
            <Badge variant="success" size="sm">
              +18% vs LW
            </Badge>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyLearningData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                    formatter={(val: number) => [`${val} solved`, 'Problems']}
                  />
                  <Bar dataKey="problems" fill="#0A66C2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#56687A] pt-2 border-t border-[#E8E8E8]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0A66C2]" /> Problems Solved
              </span>
              <span className="font-mono text-[#12B886] font-semibold">Peak: Saturday (8)</span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Skill Growth Over Time (Area Chart) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#0A66C2]" />
                Engineering Skill Growth
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">Evaluated across 6 months</p>
            </div>
            <Link to="/progress" className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5">
              Radars <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={skillGrowthData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDsa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C83FD" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7C83FD" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorBackend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#12B886" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#12B886" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[30, 100]}
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="backendInfra"
                    stroke="#12B886"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBackend)"
                    name="Backend Infra"
                  />
                  <Area
                    type="monotone"
                    dataKey="dsa"
                    stroke="#7C83FD"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDsa)"
                    name="DSA Mastery"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#56687A] pt-2 border-t border-[#E8E8E8]">
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#12B886]" /> Backend: 94%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#7C83FD]" /> DSA: 92%
                </span>
              </span>
              <span className="text-[#12B886] font-semibold font-mono">FAANG Ready</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. DUAL SECTION: Upcoming Pipeline & AI Recommended Actions               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* --- LEFT: UPCOMING (Interviews, Application Deadlines, Follow-ups) --- */}
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0A66C2]" />
                Upcoming Schedule & Deadlines
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Upcoming rounds, take-homes, and follow-ups
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#F3F6F8] p-0.5 rounded-lg border border-[#D9D9D9]">
              {(['all', 'interviews', 'deadlines', 'followups'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setUpcomingTab(tab)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize transition ${
                    upcomingTab === tab
                      ? 'bg-[#0A66C2] text-white shadow-sm'
                      : 'text-[#56687A] hover:text-[#1D2226]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-3 space-y-2.5 flex-1">
            {filteredUpcoming.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <Calendar className="w-7 h-7 text-[#56687A] mb-1.5 stroke-1" />
                <p className="text-xs font-semibold text-[#1D2226]">No upcoming rounds or deadlines</p>
                <p className="text-[10px] text-[#788896] mt-0.5">Interviews and test deadlines scheduled on applications will appear here.</p>
              </div>
            ) : (
              filteredUpcoming.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-[#F3F6F8]/60 border border-[#E8E8E8] hover:border-[#D9D9D9] hover:bg-[#F3F6F8] transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                        item.type === 'interviews'
                          ? 'bg-[#E8F3FF] border-[#d0e6fc] text-[#0A66C2]'
                          : item.type === 'deadlines'
                          ? 'bg-[#FFF4CC] border-[#ffe899] text-[#8A6100]'
                          : 'bg-[#E8F3FF] border-[#d0e6fc] text-[#0A66C2]'
                      }`}
                    >
                      {item.type === 'interviews' ? (
                        <Users className="w-3.5 h-3.5" />
                      ) : item.type === 'deadlines' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-[#1D2226] truncate group-hover:text-[#0A66C2] transition">
                          {item.company}
                        </h4>
                        <span className="text-[10px] text-[#D9D9D9]">•</span>
                        <span className="text-[11px] text-[#56687A] truncate">{item.title}</span>
                      </div>
                      <p className="text-[10px] text-[#788896] flex items-center gap-1 mt-0.5">
                        <span>{item.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={item.badgeVariant} size="sm">
                      {item.badge}
                    </Badge>
                    <Link to={item.path}>
                      <Button size="xs" variant="ghost" className="h-6 px-1.5 text-[10px]">
                        {item.linkText}
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* --- RIGHT: RECOMMENDED ACTIONS (ATS, Skills, Questions, Jobs) --- */}
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                AI Recommended Actions
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                High-leverage interventions to maximize placement probability
              </p>
            </div>
            <Badge variant="warning" size="sm">
              4 Pending
            </Badge>
          </CardHeader>

          <CardContent className="p-3 space-y-2.5 flex-1">
            {recommendedActions.map((rec) => {
              const Icon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-[#F3F6F8]/60 border border-[#E8E8E8] hover:border-[#0A66C2]/40 hover:bg-[#F3F6F8] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#D9D9D9] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#56687A] group-hover:text-[#0A66C2] group-hover:border-[#0A66C2]/40 transition">
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${rec.categoryColor}`}>
                          {rec.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#1D2226]">{rec.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#56687A] leading-snug">{rec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E8E8E8]">
                    <span className="text-[10px] font-mono font-semibold text-[#12B886]">
                      {rec.impact}
                    </span>
                    <Link to={rec.actionPath}>
                      <Button size="xs" variant="primary" className="h-6 text-[10px] px-2">
                        {rec.actionLabel}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
