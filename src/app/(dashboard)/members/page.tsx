"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Download, Trash2, Eye, Edit, ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";
import { formatDate, calculateAge } from "@/lib/utils/format";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Member {
  id: number;
  membershipId: string;
  name: string;
  nameTamil?: string;
  district: string;
  taluk: string;
  phone: string;
  status: string;
  createdAt: string;
  position?: string;
  dateOfBirth?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const statusColors: Record<string, string> = {
  ACTIVE: "badge badge-green",
  INACTIVE: "badge badge-gray",
  SUSPENDED: "badge badge-red",
  EXPIRED: "badge badge-yellow",
};

export default function MembersPage() {
  const { hasPermission } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [districts, setDistricts] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        ...(search && { search }),
        ...(district && { district }),
        ...(status && { status }),
      });

      const res = await apiFetch(`/api/members?${params}`);
      const json = await res.json();
      if (json.success) {
        setMembers(json.data);
        setPagination(json.pagination);
      }
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [page, search, district, status]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetch("/api/members/stats?type=districts")
      .then((r) => r.json())
      .then((j) => setDistricts(j.data || []))
      .catch(() => {});
  }, []);

  const handleDelete = (id: number, name: string) => {
    setConfirmDelete({ id, name });
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setDeletingId(id);
    setConfirmDelete(null);
    try {
      const res = await apiFetch(`/api/members/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Member deleted");
        fetchMembers();
      } else {
        toast.error(json.message || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  const actionButtons = (member: Member) => (
    <div className="flex items-center gap-1">
      <Link
        href={`/members/${member.id}`}
        className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded transition-colors"
        title="View"
      >
        <Eye size={15} />
      </Link>
      {hasPermission("members:update") && (
        <Link
          href={`/members/${member.id}/edit`}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit"
        >
          <Edit size={15} />
        </Link>
      )}
      {hasPermission("members:delete") && (
        <button
          onClick={() => handleDelete(member.id, member.name)}
          disabled={deletingId === member.id}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  const pagination_controls = pagination && pagination.totalPages > 1 && (
    <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-500">
        <span className="hidden sm:inline">
          Showing {(pagination.page - 1) * pagination.pageSize + 1}–
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
        </span>
        {pagination.total.toLocaleString()} members
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(page - 1)}
          disabled={!pagination.hasPrev}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm text-slate-600 px-2">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={!pagination.hasNext}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
          <p className="text-slate-500 text-sm">
            {pagination ? `${pagination.total.toLocaleString()} total members` : "Loading..."}
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission("members:export") && (
            <a href="/api/members/export?format=excel" className="btn btn-outline" target="_blank">
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </a>
          )}
          {hasPermission("members:create") && (
            <Link href="/members/new" className="btn btn-primary">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Member</span>
              <span className="sm:hidden">Add</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-input pl-9"
            />
          </div>
          <select
            value={district}
            onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
            className="form-input w-full sm:w-auto sm:min-w-40"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="form-input w-full sm:w-auto"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Mobile card list — shown below md */}
      <div className="card overflow-hidden md:hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-slate-100 rounded w-2/5" />
                  <div className="h-5 bg-slate-100 rounded w-16" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Search size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium">No members found</p>
            {(search || district || status) && (
              <p className="text-sm mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.id} className="p-4 space-y-2 active:bg-slate-50">
                {/* Name row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/members/${member.id}`} className="font-medium text-slate-900 hover:text-primary leading-tight">
                      {member.name}
                    </Link>
                    {member.nameTamil && (
                      <p className="text-xs text-slate-400 tamil leading-tight">{member.nameTamil}</p>
                    )}
                    {member.position && (
                      <p className="text-xs text-slate-400 leading-tight">{member.position}</p>
                    )}
                  </div>
                  <span className={`${statusColors[member.status] || "badge badge-gray"} flex-shrink-0`}>
                    {member.status}
                  </span>
                </div>
                {/* ID + location row */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-primary font-medium">{member.membershipId}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-0.5 text-slate-500">
                    <MapPin size={11} className="flex-shrink-0" />
                    {member.district}, {member.taluk}
                  </span>
                </div>
                {/* Phone + actions row */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Phone size={12} className="text-slate-400" />
                    <span className="font-mono">{member.phone}</span>
                    {member.dateOfBirth && (
                      <span className="text-slate-400 text-xs ml-1">· {calculateAge(member.dateOfBirth)}y</span>
                    )}
                  </span>
                  {actionButtons(member)}
                </div>
              </div>
            ))}
          </div>
        )}
        {pagination_controls}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Member"
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Desktop table — hidden below md */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Member ID</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">District</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Taluk</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Phone</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Age</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Joined</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="text-slate-400">
                      <Search size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No members found</p>
                      {(search || district || status) && (
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/members/${member.id}`} className="font-mono text-primary hover:underline text-xs font-medium">
                        {member.membershipId}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        {member.nameTamil && (
                          <p className="text-xs text-slate-400 tamil">{member.nameTamil}</p>
                        )}
                        {member.position && (
                          <p className="text-xs text-slate-400">{member.position}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{member.district}</td>
                    <td className="px-5 py-3 text-slate-600">{member.taluk}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">{member.phone}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {calculateAge(member.dateOfBirth) ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={statusColors[member.status] || "badge badge-gray"}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(member.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {actionButtons(member)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination_controls}
      </div>
    </div>
  );
}
