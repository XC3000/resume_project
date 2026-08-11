import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import {
  Box,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Search,
  Bell,
  Sun,
  Plus,
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  BarChart2,
  DollarSign,
  Package,
  MoreHorizontal,
  Briefcase,
  UserCheck,
  Building2,
  LogOut,
  ShoppingBag,
  FolderKanban,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user, signOut } = useAuth();

  // Interactive UI state
  const [activeDashboard, setActiveDashboard] = useState<string>('Dashboard 1');
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState<boolean>(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('Shadcnblocks Admin Kit');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [ecommerceExpanded, setEcommerceExpanded] = useState<boolean>(true);
  const [projectExpanded, setProjectExpanded] = useState<boolean>(false);

  const teamsList = [
    { name: 'Shadcnblocks Admin Kit', shortcut: '⌘1', icon: <Box size={16} /> },
    { name: 'Northstar Ops', shortcut: '⌘2', icon: <Briefcase size={16} /> },
    { name: 'Meridian Labs.', shortcut: '⌘3', icon: <Building2 size={16} /> },
  ];

  const dashboards = [
    'Dashboard 1',
    'Dashboard 2',
    'Dashboard 3',
    'Dashboard 4',
    'Dashboard 5',
    'Dashboard 6',
    'Dashboard 7',
    'Dashboard 8',
    'Dashboard 9',
  ];

  return (
    <div className="flex min-h-screen w-screen m-0 p-0 bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between p-3 sticky top-0 h-screen z-30">
        <div className="flex flex-col gap-5 overflow-y-auto">
          {/* Team Switcher Header */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
              className="w-full flex items-center justify-between p-2 h-auto border-slate-200 bg-white"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Box size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedTeam}
                  </div>
                  <div className="text-xs text-slate-500">Nextjs + shadcn/ui</div>
                </div>
              </div>
              <ChevronsUpDown size={16} className="text-slate-500" />
            </Button>

            {/* Teams Dropdown Menu (Shadcn Popover UI) */}
            {isTeamMenuOpen && (
              <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Teams
                </div>
                {teamsList.map((t) => (
                  <Button
                    key={t.name}
                    variant={selectedTeam === t.name ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setSelectedTeam(t.name);
                      setIsTeamMenuOpen(false);
                    }}
                    className="w-full justify-between px-2.5 py-2 text-xs mb-0.5 text-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      {t.icon}
                      <span>{t.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{t.shortcut}</span>
                  </Button>
                ))}

                <div className="h-px bg-slate-200 my-1.5" />

                <Button
                  variant="ghost"
                  onClick={() => alert('Add new team modal')}
                  className="w-full justify-start px-2.5 py-2 text-xs text-slate-500"
                >
                  <Plus size={16} />
                  <span>Add team</span>
                </Button>
              </div>
            )}
          </div>

          {/* Ecommerce Nav Group */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2 px-2">
              Ecommerce
            </div>

            {/* Dashboard Submenu */}
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                onClick={() => setEcommerceExpanded(!ecommerceExpanded)}
                className="w-full justify-between px-2.5 py-2 text-sm font-semibold text-slate-900"
              >
                <div className="flex items-center gap-2">
                  <LayoutGridIcon />
                  <span>Dashboard</span>
                </div>
                {ecommerceExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
              </Button>

              {ecommerceExpanded && (
                <div className="flex flex-col gap-0.5 pl-3.5">
                  {dashboards.map((dash) => (
                    <Button
                      key={dash}
                      variant={activeDashboard === dash ? 'secondary' : 'ghost'}
                      onClick={() => setActiveDashboard(dash)}
                      className={`w-full justify-start px-3 py-1.5 text-xs ${
                        activeDashboard === dash ? 'font-bold text-slate-900 bg-slate-100' : 'font-medium text-slate-600'
                      }`}
                    >
                      {dash}
                    </Button>
                  ))}
                </div>
              )}

              {/* Other Ecommerce Items */}
              {['Products', 'Orders', 'Customers', 'Shipments'].map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  className="w-full justify-between px-2.5 py-2 text-sm font-medium text-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon name={item} />
                    <span>{item}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </Button>
              ))}
            </div>
          </div>

          {/* Project Management Nav Group */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2 px-2">
              Project Management
            </div>
            <div className="flex flex-col gap-0.5">
              {['Dashboard', 'Projects', 'Teams', 'Members'].map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  onClick={() => setProjectExpanded(!projectExpanded)}
                  className="w-full justify-between px-2.5 py-2 text-sm font-medium text-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon name={item} />
                    <span>{item}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="border-t border-slate-200 pt-3 relative">
          <Button
            variant="ghost"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full justify-between p-1.5 h-auto"
          >
            <div className="flex items-center gap-2.5">
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.username || 'ausrobdev'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {user?.email || 'rob@shadcnblocks.com'}
                </div>
              </div>
            </div>
            <ChevronsUpDown size={16} className="text-slate-400" />
          </Button>

          {/* Profile Menu Popover */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-14 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50">
              <Button
                variant="destructive"
                onClick={() => signOut()}
                className="w-full justify-start px-2.5 py-2 text-xs"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 gap-4 sticky top-0 z-20">
          {/* Search Box with Shadcn Input */}
          <div className="relative w-52">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search..."
              className="pl-8 pr-11 bg-slate-50 border-slate-200 text-xs"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-500 font-mono">
              ⌘ K
            </span>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <Button variant="outline" size="icon" className="border-slate-200">
              <Bell size={18} className="text-slate-600" />
            </Button>
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1 py-0.25 leading-none">
              2
            </span>
          </div>

          {/* Theme Toggle Button */}
          <Button variant="outline" size="icon" className="border-slate-200">
            <Sun size={18} className="text-slate-600" />
          </Button>

          {/* Color Preset Selector Pill */}
          <Button variant="outline" className="rounded-full px-3 h-9 border-slate-200 text-xs font-semibold text-slate-900">
            <div className="flex gap-1 items-center mr-1">
              <div className="w-2 h-2 rounded-full bg-slate-900" />
              <div className="w-2 h-2 rounded-full bg-slate-200" />
              <div className="w-2 h-2 rounded-full bg-slate-200" />
            </div>
            <span>Default</span>
            <ChevronDown size={14} className="text-slate-500 ml-1" />
          </Button>
        </header>

        {/* Dashboard Grid Content */}
        <div className="p-8 flex flex-col gap-6">
          {/* ==================== TOP METRICS ROW (3 CARDS) ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Orders Fulfilled */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                  <FileText size={18} />
                  <span>Orders fulfilled</span>
                </div>
                <CardDescription className="text-xs text-slate-400">18,452 previous month</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex items-baseline justify-between">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  21,847
                </div>
                <Badge variant="success" className="bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <TrendingUp size={14} />
                  <span>+18.4% vs last month</span>
                </Badge>
              </CardContent>
            </Card>

            {/* Card 2: New Customers */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                  <Users size={18} />
                  <span>New customers</span>
                </div>
                <CardDescription className="text-xs text-slate-400">4,120 previous month</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex items-baseline justify-between">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  4,975
                </div>
                <Badge variant="success" className="bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <TrendingUp size={14} />
                  <span>+20.8% vs last month</span>
                </Badge>
              </CardContent>
            </Card>

            {/* Card 3: Refunds Issued */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                  <CreditCard size={18} />
                  <span>Refunds issued</span>
                </div>
                <CardDescription className="text-xs text-slate-400">$9,821.00 previous month</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex items-baseline justify-between">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  $8,473.00
                </div>
                <Badge variant="destructive" className="bg-rose-50 text-rose-600 border border-rose-200">
                  <TrendingDown size={14} />
                  <span>-13.7% vs last month</span>
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* ==================== MIDDLE ROW CHARTS (2 CARDS) ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Total Revenue (Line Chart) */}
            <Card className="lg:col-span-2 bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardHeader className="p-0 pb-4 flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <BarChart3 size={20} />
                  <span>Total Revenue</span>
                </CardTitle>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                    <span>This Year</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span>Prev Year</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 pt-2 flex flex-col gap-4">
                <div>
                  <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    $633,000.00
                  </div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                    THIS YEAR VS LAST YEAR
                  </div>
                </div>

                {/* Line Chart SVG */}
                <div className="relative w-full h-56 mt-2">
                  <svg width="100%" height="100%" viewBox="0 0 700 200" preserveAspectRatio="none" className="overflow-visible">
                    {[0, 40, 80, 120, 160].map((y) => (
                      <line key={y} x1="40" y1={y} x2="680" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    ))}
                    <text x="0" y="10" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">$80K</text>
                    <text x="0" y="50" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">$60K</text>
                    <text x="0" y="90" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">$40K</text>
                    <text x="0" y="130" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">$20K</text>
                    <text x="12" y="170" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">$0</text>
                    <path
                      d="M 50 120 Q 100 135 150 100 T 250 110 T 350 125 T 450 105 T 550 115 T 650 90"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 50 110 L 100 125 L 150 90 L 200 110 L 250 70 L 300 105 L 350 75 L 400 95 L 450 60 L 500 85 L 550 50 L 650 35"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                    />
                    {[
                      [50, 110], [100, 125], [150, 90], [200, 110], [250, 70],
                      [300, 105], [350, 75], [400, 95], [450, 60], [500, 85], [550, 50], [650, 35]
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="flex justify-between pl-10 pr-5 text-xs text-slate-400 mt-2">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Revenue by Channel */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <BarChart2 size={20} />
                  <span>Revenue by Channel</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex flex-col gap-5">
                <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                    <span>Online</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                    <span>In-Store</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Wholesale</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span>Marketplace</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-1">
                  {[
                    { month: 'Jan', w1: 45, w2: 20, w3: 15, w4: 10 },
                    { month: 'Feb', w1: 42, w2: 22, w3: 18, w4: 12 },
                    { month: 'Mar', w1: 52, w2: 18, w3: 16, w4: 10 },
                    { month: 'Apr', w1: 46, w2: 24, w3: 15, w4: 12 },
                    { month: 'May', w1: 58, w2: 20, w3: 14, w4: 12 },
                    { month: 'Jun', w1: 62, w2: 18, w3: 16, w4: 10 },
                  ].map((row) => (
                    <div key={row.month} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-7">{row.month}</span>
                      <div className="flex-1 h-5.5 flex rounded-md overflow-hidden">
                        <div style={{ width: `${row.w1}%` }} className="bg-slate-900" />
                        <div style={{ width: `${row.w2}%` }} className="bg-slate-600" />
                        <div style={{ width: `${row.w3}%` }} className="bg-slate-400" />
                        <div style={{ width: `${row.w4}%` }} className="bg-slate-300" />
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pl-10 text-xs text-slate-400 mt-2">
                    <span>$0</span>
                    <span>$30K</span>
                    <span>$60K</span>
                    <span>$90K</span>
                    <span>$120K</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ==================== BOTTOM ROW METRICS (3 CARDS) ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Average Order Value */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardContent className="p-0 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
                      <DollarSign size={18} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600">Average Order Value</span>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <MoreHorizontal size={18} className="text-slate-400" />
                  </Button>
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-2xl font-extrabold text-slate-900">$959.00</div>
                  <Badge variant="success" className="bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <TrendingUp size={12} />
                    <span>2.4% vs last month</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Average Sales */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardContent className="p-0 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
                      <BarChart3 size={18} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600">Average Sales</span>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <MoreHorizontal size={18} className="text-slate-400" />
                  </Button>
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-2xl font-extrabold text-slate-900">837</div>
                  <Badge variant="success" className="bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <TrendingUp size={12} />
                    <span>1.3% vs last month</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Product Categories */}
            <Card className="bg-white border-slate-200 rounded-2xl p-6 shadow-sm">
              <CardContent className="p-0 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
                      <Package size={18} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600">Product Categories</span>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <MoreHorizontal size={18} className="text-slate-400" />
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-slate-600 font-semibold">
                    <span>Electronics & Hardware</span>
                    <span>72%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[72%] h-full bg-slate-900 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper Icon components
const LayoutGridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const ItemIcon: React.FC<{ name: string }> = ({ name }) => {
  switch (name) {
    case 'Products': return <ShoppingBag size={18} className="text-slate-500" />;
    case 'Orders': return <FileText size={18} className="text-slate-500" />;
    case 'Customers': return <Users size={18} className="text-slate-500" />;
    case 'Shipments': return <Package size={18} className="text-slate-500" />;
    case 'Projects': return <FolderKanban size={18} className="text-slate-500" />;
    case 'Teams': return <Building2 size={18} className="text-slate-500" />;
    case 'Members': return <UserCheck size={18} className="text-slate-500" />;
    default: return <Box size={18} className="text-slate-500" />;
  }
};
