import React, { useId, useSyncExternalStore } from 'react';
import { Check, X } from 'lucide-react';

// A miniature product UI, weighted like a real app — mostly surfaces and text,
// brand color on key actions, status colors small.

type DemoTab = 'overview' | 'projects' | 'team';
type ProjectFilter = 'All' | 'Live' | 'Review' | 'Draft' | 'Failed';

interface Member {
  name: string;
  email: string;
  role: string;
  pending?: boolean;
}

interface Project {
  name: string;
  meta: string;
  status: Exclude<ProjectFilter, 'All'>;
  tint: string;
  dot: string;
  pct: number;
}

interface DemoState {
  tab: DemoTab;
  projects: Project[];
  dialogOpen: boolean;
  draftName: string;
  draftDot: string;
  filter: ProjectFilter;
  members: Member[];
  email: string;
  role: string;
  canPublish: boolean;
  notice: { kind: 'good' | 'bad'; text: string } | null;
}

// Shared by the light and dark previews so both sides show the same screen.
let demoState: DemoState = {
  tab: 'overview',
  projects: [],
  dialogOpen: false,
  draftName: '',
  draftDot: 'bg-t-primary',
  filter: 'All',
  members: [
    { name: 'John Zheng', email: 'john@taichi.dev', role: 'Admin' },
    { name: 'Mei Lin', email: 'mei@taichi.dev', role: 'Designer' },
    { name: 'Sam Ortiz', email: 'sam@taichi.dev', role: 'Developer' },
  ],
  email: '',
  role: 'Designer',
  canPublish: true,
  notice: null,
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getDemoState = () => demoState;
const setDemoState = (patch: Partial<DemoState>) => {
  demoState = { ...demoState, ...patch };
  listeners.forEach((listener) => listener());
};

const PROJECTS: Project[] = [
  { name: 'Marketing site', meta: 'Updated 2h ago', status: 'Live', tint: 'tint-good', dot: 'bg-t-primary', pct: 92 },
  { name: 'Mobile app', meta: 'Updated yesterday', status: 'Review', tint: 'tint-warn', dot: 'bg-t-secondary', pct: 64 },
  { name: 'Design system', meta: 'Updated 3d ago', status: 'Draft', tint: 'tint-neutral', dot: 'bg-t-accent', pct: 38 },
  { name: 'Billing API', meta: 'Build failed', status: 'Failed', tint: 'tint-bad', dot: 'bg-t-primary', pct: 15 },
  { name: 'Docs portal', meta: 'Updated 5d ago', status: 'Live', tint: 'tint-good', dot: 'bg-t-accent', pct: 100 },
  { name: 'Onboarding flow', meta: 'Updated last week', status: 'Draft', tint: 'tint-neutral', dot: 'bg-t-secondary', pct: 22 },
];
const PROJECT_DOTS = ['bg-t-primary', 'bg-t-secondary', 'bg-t-accent'];

const LINE_THIS = 'M0,62 C25,58 30,40 50,44 S85,66 100,52 S135,18 150,26 S185,48 200,36 S235,8 250,16 S285,30 300,12';
const LINE_LAST = 'M0,70 C25,68 30,58 50,60 S85,72 100,64 S135,44 150,50 S185,62 200,54 S235,38 250,42 S285,50 300,40';
const DONUT = [
  { label: 'Direct', pct: 46, start: 0, color: 'var(--primary)' },
  { label: 'Search', pct: 31, start: 46, color: 'var(--secondary)' },
  { label: 'Social', pct: 23, start: 77, color: 'var(--accent)' },
];

demoState = { ...demoState, projects: PROJECTS };

const FILTERS: ProjectFilter[] = ['All', 'Live', 'Review', 'Draft', 'Failed'];
const AVATAR_FILLS = ['bg-t-primary text-t-primaryFg', 'bg-t-secondary text-t-secondaryFg', 'bg-t-accent text-t-accentFg'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ThemeShowcaseProps {
  rClass: string;
  bClass: string;
  sClass: string;
  gradientClass: string;
  gradientSecondary: string;
  gradientAccent: string;
}

const ThemeShowcase: React.FC<ThemeShowcaseProps> = ({
  rClass,
  bClass,
  sClass,
  gradientClass,
  gradientSecondary,
  gradientAccent,
}) => {
  const chartId = useId();
  const state = useSyncExternalStore(subscribe, getDemoState, getDemoState);
  const { tab, filter, members, email, role, canPublish, notice, projects, dialogOpen, draftName, draftDot } = state;

  const cardClass = `${rClass} ${bClass} ${sClass} bg-t-card`;
  const fieldClass = `w-full px-2.5 py-1.5 ${rClass} ${bClass} bg-t-bg text-xs text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`;
  const primaryButton = `${gradientClass} text-t-primaryFg px-3 py-1.5 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95`;

  const sendInvite = (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) {
      setDemoState({ notice: { kind: 'bad', text: 'Enter a valid email address.' } });
      return;
    }
    if (members.some((member) => member.email === address)) {
      setDemoState({ notice: { kind: 'bad', text: `${address} is already on the team.` } });
      return;
    }
    const name = address.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    setDemoState({
      members: [...members, { name, email: address, role: canPublish ? role : `${role} (read-only)`, pending: true }],
      email: '',
      tab: 'team',
      notice: { kind: 'good', text: `Invite sent to ${address}.` },
    });
  };

  const createProject = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    setDemoState({
      projects: [{ name, meta: 'Created just now', status: 'Draft', tint: 'tint-neutral', dot: draftDot, pct: 0 }, ...projects],
      dialogOpen: false,
      draftName: '',
      tab: 'projects',
      filter: 'All',
      notice: { kind: 'good', text: `${name} created as a draft.` },
    });
  };

  const projectRows = (rows: Project[]) =>
    rows.map((row) => (
      <div key={row.name} className="flex items-center gap-3 px-3 py-2 border-b border-themed last:border-b-0 transition-colors hover:bg-t-card2">
        <div className={`h-7 w-7 shrink-0 ${rClass} ${row.dot} opacity-90`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-t-text truncate">{row.name}</p>
          <p className="text-[10px] text-t-textMuted truncate">{row.meta}</p>
        </div>
        <div className="hidden sm:block w-16 h-1.5 rounded-full bg-t-text/10">
          <div className={`h-full rounded-full ${gradientClass}`} style={{ width: `${row.pct}%` }} />
        </div>
        <span className={`${rClass} ${row.tint} px-2 py-0.5 text-[10px] font-semibold`}>{row.status}</span>
      </div>
    ));

  const inviteForm = (
    <form onSubmit={sendInvite} className={`${cardClass} p-3 space-y-2.5`}>
      <div>
        <p className="text-xs font-semibold text-t-text">Invite a teammate</p>
        <p className="text-[10px] text-t-textMuted">Demo only — adds them to the Team tab, no email is sent.</p>
      </div>
      <input
        type="text"
        value={email}
        onChange={(event) => setDemoState({ email: event.target.value, notice: null })}
        placeholder="name@company.com"
        className={fieldClass}
        aria-label="Teammate email"
      />
      <select value={role} onChange={(event) => setDemoState({ role: event.target.value })} className={`${fieldClass} cursor-pointer`} aria-label="Role">
        <option>Designer</option>
        <option>Developer</option>
        <option>Admin</option>
      </select>
      <label className="flex items-center gap-2 text-[11px] text-t-text cursor-pointer">
        <input type="checkbox" checked={canPublish} onChange={(event) => setDemoState({ canPublish: event.target.checked })} className="h-3.5 w-3.5" />
        <span>Can publish changes</span>
      </label>
      <div className="flex gap-2 pt-0.5">
        <button type="submit" className={`flex-1 ${primaryButton}`}>Send invite</button>
        <button type="button" onClick={() => setDemoState({ email: '', notice: null })} className={`btn-ghost px-3 py-1.5 ${rClass} text-xs font-semibold transition-colors`}>
          Cancel
        </button>
      </div>
    </form>
  );

  const tabButton = (id: DemoTab, label: string) => (
    <button
      type="button"
      onClick={() => setDemoState({ tab: id })}
      className={`${rClass} px-2.5 py-1 transition-colors ${tab === id ? 'tint-primary' : 'text-t-textMuted hover:text-t-text'}`}
      aria-current={tab === id ? 'page' : undefined}
    >
      {label}
    </button>
  );

  return (
    <section className={`relative overflow-hidden ${bClass} ${rClass} ${sClass} bg-t-card`}>
      {/* App bar */}
      <div className="flex items-center gap-3 border-b border-themed px-4 py-2.5">
        <div className={`h-6 w-6 shrink-0 ${rClass} ${gradientClass} flex items-center justify-center text-t-primaryFg text-[11px] font-black`}>T</div>
        <nav className="flex items-center gap-1 text-xs font-semibold">
          {tabButton('overview', 'Overview')}
          {tabButton('projects', 'Projects')}
          {tabButton('team', 'Team')}
        </nav>
        <input type="text" placeholder="Search..." className={`ml-auto hidden lg:block w-32 px-2.5 py-1 ${rClass} ${bClass} bg-t-bg text-xs text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`} />
        <button type="button" onClick={() => setDemoState({ dialogOpen: true })} className={`ml-auto lg:ml-0 ${primaryButton}`}>
          New project
        </button>
        <div className="h-6 w-6 shrink-0 rounded-full bg-t-secondary text-t-secondaryFg flex items-center justify-center text-[10px] font-bold">JZ</div>
      </div>

      <div className="bg-t-bg p-4 space-y-4">
        {notice && (
          <div className={`${rClass} border ${notice.kind === 'good' ? 'alert-good' : 'alert-bad'} px-3 py-1.5 text-[11px] flex items-center gap-2`}>
            {notice.kind === 'good' ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0" />}
            <span className="flex-1 min-w-0">{notice.text}</span>
            <button type="button" onClick={() => setDemoState({ notice: null })} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
              <X size={12} />
            </button>
          </div>
        )}

        {tab === 'overview' && (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-t-text leading-tight">Good morning, John</h2>
                <p className="text-xs text-t-textMuted">
                  3 projects shipped this week &middot;{' '}
                  <button type="button" onClick={() => setDemoState({ tab: 'projects', filter: 'Live' })} className="text-t-primary font-semibold hover:underline">view report</button>
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={`btn-ghost px-3 py-1.5 ${rClass} text-xs font-semibold transition-colors`}>Export</button>
                <button type="button" onClick={() => setDemoState({ tab: 'team' })} className={`btn-soft px-3 py-1.5 ${rClass} text-xs font-semibold transition-colors`}>Invite</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Revenue', value: '$48.2k', delta: '+12%', tint: 'tint-good', bars: [40, 55, 45, 70, 62, 88], bar: gradientClass },
                { label: 'Active users', value: '2,941', delta: '+4%', tint: 'tint-good', bars: [60, 52, 66, 58, 74, 80], bar: gradientSecondary },
                { label: 'Churn', value: '1.8%', delta: '-0.3%', tint: 'tint-bad', bars: [70, 64, 58, 50, 46, 38], bar: gradientAccent },
              ].map((stat) => (
                <div key={stat.label} className={`${cardClass} p-3 space-y-2`}>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] text-t-textMuted truncate">{stat.label}</p>
                    <span className={`${rClass} ${stat.tint} px-1.5 py-0.5 text-[10px] font-semibold`}>{stat.delta}</span>
                  </div>
                  <p className="text-xl font-bold text-t-text leading-none">{stat.value}</p>
                  <div className="flex items-end gap-1 h-8">
                    {stat.bars.map((h, i) => (
                      <div key={i} className={`flex-1 rounded-sm ${stat.bar}`} style={{ height: `${h}%`, opacity: 0.45 + i * 0.11 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts: line + area, donut, stacked bars */}
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className={`${cardClass} p-3 space-y-2`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-t-text">Traffic</p>
                  <div className="flex items-center gap-3 text-[10px] text-t-textMuted">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-t-primary" />This week</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-t-secondary" />Last week</span>
                  </div>
                </div>
                <div className="relative">
                  {/* Hover readout: translucent so the lines stay visible through it */}
                  <div className="pointer-events-none absolute inset-y-0 left-[66.6%] w-px bg-t-text/25" />
                  <div className="pointer-events-none absolute left-[66.6%] top-[28%] -ml-1 h-2 w-2 rounded-full bg-t-primary ring-4 ring-t-primary/25" />
                  <div className={`pointer-events-none absolute left-[66.6%] top-0 -translate-x-[105%] ${rClass} bg-t-text/80 px-2 py-1 text-[10px] leading-tight text-t-bg backdrop-blur-sm ${sClass}`}>
                    <p className="font-semibold">Fri &middot; 3,482</p>
                    <p className="opacity-70">+18% vs last week</p>
                  </div>
                <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="w-full h-24" role="img" aria-label="Traffic line chart">
                  <defs>
                    <linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[22, 45, 68].map((y) => (
                    <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={`${LINE_THIS} L300,90 L0,90 Z`} fill={`url(#${chartId}-area)`} />
                  <path d={LINE_LAST} fill="none" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <path d={LINE_THIS} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                </div>
                <div className="flex justify-between text-[10px] text-t-textMuted">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
                </div>
              </div>

              <div className={`${cardClass} p-3 space-y-3`}>
                <p className="text-xs font-semibold text-t-text">Sources</p>
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 42 42" className="h-20 w-20 shrink-0 -rotate-90" role="img" aria-label="Traffic sources donut chart">
                    <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--border)" strokeWidth="6" />
                    {DONUT.map((slice) => (
                      <circle
                        key={slice.label}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="6"
                        strokeDasharray={`${slice.pct - 1.5} ${100 - slice.pct + 1.5}`}
                        strokeDashoffset={-slice.start}
                      />
                    ))}
                  </svg>
                  <div className="flex-1 min-w-0 space-y-1 text-[11px]">
                    {DONUT.map((slice) => (
                      <div key={slice.label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} />
                        <span className="flex-1 truncate text-t-textMuted">{slice.label}</span>
                        <span className="font-semibold text-t-text">{slice.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-t-textMuted">
                    <span>Storage</span>
                    <span>68 of 100 GB</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-t-text/10">
                    <div className="bg-t-primary" style={{ width: '38%' }} />
                    <div className="bg-t-secondary" style={{ width: '18%' }} />
                    <div className="bg-t-accent" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className={`${cardClass} overflow-hidden`}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-themed">
                  <p className="text-xs font-semibold text-t-text">Projects</p>
                  <button type="button" onClick={() => setDemoState({ tab: 'projects', filter: 'All' })} className="text-[11px] text-t-accent font-semibold hover:underline">See all</button>
                </div>
                {projectRows(projects.slice(0, 4))}
              </div>
              {inviteForm}
            </div>

            {/* Frosted glass over a brand gradient: translucent chips pick up the
                colors behind them, which is where a palette's blends show. */}
            <div className={`relative overflow-hidden ${rClass} ${gradientClass} px-4 py-3 text-t-primaryFg`}>
              <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-t-accent/70 blur-2xl" />
              <div className="pointer-events-none absolute right-24 -bottom-12 h-24 w-24 rounded-full bg-t-secondary/60 blur-2xl" />
              <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Upgrade to Pro</p>
                  <p className="text-[11px] opacity-80">Unlimited projects, shared palettes, priority builds.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  {['Unlimited', 'SSO', '-20% yearly'].map((perk) => (
                    <span
                      key={perk}
                      className={`${rClass} border px-2 py-1 backdrop-blur-md`}
                      style={{
                        backgroundColor: 'color-mix(in oklab, var(--primary-fg) 16%, transparent)',
                        borderColor: 'color-mix(in oklab, var(--primary-fg) 30%, transparent)',
                      }}
                    >
                      {perk}
                    </span>
                  ))}
                  <button type="button" className={`${rClass} bg-t-card/90 px-2.5 py-1 text-t-text backdrop-blur-md transition-colors hover:bg-t-card`}>
                    Upgrade
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'projects' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-t-text leading-tight">Projects</h2>
              <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                {FILTERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDemoState({ filter: name })}
                    className={`${rClass} px-2 py-1 transition-colors ${filter === name ? 'bg-t-primary text-t-primaryFg' : 'tint-neutral hover:bg-t-card2'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className={`${cardClass} overflow-hidden`}>
              {projectRows(projects.filter((row) => filter === 'All' || row.status === filter))}
              {projects.every((row) => filter !== 'All' && row.status !== filter) && (
                <p className="px-3 py-6 text-center text-xs text-t-textMuted">No projects here yet.</p>
              )}
            </div>
          </>
        )}

        {tab === 'team' && (
          <>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-bold text-t-text leading-tight">Team</h2>
              <p className="text-xs text-t-textMuted">{members.length} members</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr] items-start">
              <div className={`${cardClass} overflow-hidden`}>
                {members.map((member, index) => (
                  <div key={member.email} className="flex items-center gap-3 px-3 py-2 border-b border-themed last:border-b-0 transition-colors hover:bg-t-card2">
                    <div className={`h-7 w-7 shrink-0 rounded-full ${AVATAR_FILLS[index % AVATAR_FILLS.length]} flex items-center justify-center text-[10px] font-bold`}>
                      {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-t-text truncate">{member.name}</p>
                      <p className="text-[10px] text-t-textMuted truncate">{member.email}</p>
                    </div>
                    {member.pending && <span className={`${rClass} tint-warn px-2 py-0.5 text-[10px] font-semibold`}>Pending</span>}
                    <span className={`${rClass} tint-neutral px-2 py-0.5 text-[10px] font-semibold`}>{member.role}</span>
                    {member.pending && (
                      <button
                        type="button"
                        onClick={() => setDemoState({ members: members.filter((m) => m.email !== member.email), notice: null })}
                        className="text-t-bad opacity-70 hover:opacity-100"
                        aria-label={`Remove ${member.name}`}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {inviteForm}
            </div>
          </>
        )}
      </div>

      {/* Modal: a blurred, semi-transparent scrim keeps the page readable behind it */}
      {dialogOpen && (
        <div
          className="absolute inset-0 z-20 flex items-start justify-center p-6 pt-16 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in oklab, var(--bg) 60%, transparent)' }}
          onClick={() => setDemoState({ dialogOpen: false })}
        >
          <form
            onSubmit={createProject}
            onClick={(event) => event.stopPropagation()}
            className={`w-full max-w-xs ${rClass} ${bClass} bg-t-card/95 p-4 space-y-3 shadow-2xl backdrop-blur-md`}
            role="dialog"
            aria-label="New project"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-t-text">New project</p>
                <p className="text-[11px] text-t-textMuted">Demo only — it is added to the list as a draft.</p>
              </div>
              <button type="button" onClick={() => setDemoState({ dialogOpen: false })} aria-label="Close" className="text-t-textMuted hover:text-t-text">
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={draftName}
              onChange={(event) => setDemoState({ draftName: event.target.value })}
              placeholder="Project name"
              autoFocus
              className={fieldClass}
              aria-label="Project name"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-t-textMuted">Color</span>
              {PROJECT_DOTS.map((dot) => (
                <button
                  key={dot}
                  type="button"
                  onClick={() => setDemoState({ draftDot: dot })}
                  aria-label={dot.replace('bg-t-', '')}
                  aria-pressed={draftDot === dot}
                  className={`h-6 w-6 ${rClass} ${dot} transition-all ${draftDot === dot ? 'ring-2 ring-t-text/70 ring-offset-2 ring-offset-t-card' : 'opacity-45 hover:opacity-80'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={!draftName.trim()} className={`flex-1 ${primaryButton} disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed`}>
                Create project
              </button>
              <button type="button" onClick={() => setDemoState({ dialogOpen: false })} className={`btn-ghost px-3 py-1.5 ${rClass} text-xs font-semibold transition-colors`}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default ThemeShowcase;
