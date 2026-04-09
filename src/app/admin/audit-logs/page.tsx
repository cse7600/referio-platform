'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTOR_TYPE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  advertiser: 'bg-blue-100 text-blue-700',
  partner: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  admin: 'Admin',
  advertiser: 'Advertiser',
  partner: 'Partner',
  system: 'System',
};

const ACTION_LABELS: Record<string, string> = {
  login_success: 'Login Success',
  login_failure: 'Login Failure',
  login_locked: 'Login Locked',
  logout: 'Logout',
  view_ssn: 'View SSN',
  export_ssn: 'Export SSN',
  update_partner: 'Update Partner',
  approve_partner: 'Approve Partner',
  reject_partner: 'Reject Partner',
  update_referral: 'Update Referral',
  export_settlement: 'Export Settlement',
  complete_settlement: 'Complete Settlement',
  impersonate: 'Impersonate',
  invite_user: 'Invite User',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateForInput(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [distinctActions, setDistinctActions] = useState<string[]>([]);

  // Filters
  const [actorType, setActorType] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (actorType) params.set('actor_type', actorType);
      if (action) params.set('action', action);
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      if (data.distinctActions) {
        setDistinctActions(data.distinctActions);
      }
    } catch {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, actorType, action, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterReset = () => {
    setActorType('');
    setAction('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Audit Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Total {total.toLocaleString()} events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Actor Type */}
            <Select value={actorType} onValueChange={(v) => { setActorType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Actor Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="advertiser">Advertiser</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            {/* Action */}
            <Select value={action} onValueChange={(v) => { setAction(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {distinctActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a] || a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From"
              max={dateTo || formatDateForInput(new Date())}
            />

            {/* Date To */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To"
              min={dateFrom}
              max={formatDateForInput(new Date())}
            />

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={handleFilterReset}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Date</TableHead>
                    <TableHead className="w-[100px]">Actor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="w-[130px]">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={ACTOR_TYPE_COLORS[log.actor_type] || 'bg-gray-100'}
                        >
                          {ACTOR_TYPE_LABELS[log.actor_type] || log.actor_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.actor_email || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {log.resource_type ? (
                          <span>
                            {log.resource_type}
                            {log.resource_id && (
                              <span className="text-xs ml-1 text-gray-400">
                                ({log.resource_id.length > 8
                                  ? `${log.resource_id.slice(0, 8)}...`
                                  : log.resource_id})
                              </span>
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-400 font-mono">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} / {totalPages} ({total.toLocaleString()} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
