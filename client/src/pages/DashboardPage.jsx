import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Wallet,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { dashboardApi } from '../api/services';
import { Card, Skeleton, StatusBadge } from '../components/ui/Primitives';
import { formatCurrency, formatDateTime } from '../utils/format';

const COLORS = ['#3b66f5', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

const StatCard = ({ icon: Icon, label, value, tone, loading }) => (
  <Card className="flex items-start justify-between">
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-28 mt-2" />
      ) : (
        <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{value}</p>
      )}
    </div>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
      <Icon size={18} />
    </div>
  </Card>
);

const DashboardPage = () => {
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.stats,
  });
  const { data: monthlyRes, isLoading: monthlyLoading } = useQuery({
    queryKey: ['dashboard', 'monthly'],
    queryFn: dashboardApi.monthlyCollection,
  });
  const { data: statusRes, isLoading: statusLoading } = useQuery({
    queryKey: ['dashboard', 'status'],
    queryFn: dashboardApi.paymentStatus,
  });
  const { data: semesterRes, isLoading: semesterLoading } = useQuery({
    queryKey: ['dashboard', 'semester'],
    queryFn: dashboardApi.collectionBySemester,
  });

  const stats = statsRes?.data?.data;
  const monthly = monthlyRes?.data?.data || [];
  const statusData = statusRes?.data?.data || [];
  const semesterData = semesterRes?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.totalStudents ?? 0}
          tone="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
          loading={statsLoading}
        />
        <StatCard
          icon={Wallet}
          label="Fees Collected"
          value={formatCurrency(stats?.feesCollected)}
          tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          loading={statsLoading}
        />
        <StatCard
          icon={AlertCircle}
          label="Outstanding Fees"
          value={formatCurrency(stats?.outstandingFees)}
          tone="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          loading={statsLoading}
        />
        <StatCard
          icon={CalendarDays}
          label="Today's Collection"
          value={formatCurrency(stats?.todaysCollection)}
          tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Monthly Collection Trend</h3>
              <p className="text-xs text-slate-500">Last 12 months</p>
            </div>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          {monthlyLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b66f5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b66f5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="amount" stroke="#3b66f5" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Payment Status</h3>
          {statusLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : statusData.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No payment data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusData.map((entry, idx) => (
                    <Cell key={entry.status} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Collection by Semester</h3>
          {semesterLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={semesterData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="semester" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#3b66f5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Recent Transactions</h3>
            <ReceiptIcon size={16} className="text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full my-2" />)
            ) : stats?.recentTransactions?.length ? (
              stats.recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {t.student.firstName} {t.student.lastName}
                      <span className="text-slate-400 font-normal ml-2 text-xs">{t.student.studentId}</span>
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(t.paidAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(t.amountPaid)}
                    </p>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No transactions yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
