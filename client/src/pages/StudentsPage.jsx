import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Users, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentApi } from '../api/services';
import { BASE_URL } from '../api/client';
import { Card, Skeleton, StatusBadge, Pagination, EmptyState } from '../components/ui/Primitives';
import { formatDate, initials } from '../utils/format';
import StudentFormModal from '../components/students/StudentFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import useDebounce from '../hooks/useDebounce';

const StudentsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students', { search: debouncedSearch, page, department }],
    queryFn: () =>
      studentApi.list({ search: debouncedSearch, page, limit: 12, department: department || undefined }),
  });

  const { data: filtersRes } = useQuery({ queryKey: ['students', 'filters'], queryFn: studentApi.filters });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentApi.remove(id),
    onSuccess: () => {
      toast.success('Student deleted');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete student'),
  });

  const students = data?.data?.data?.students || [];
  const pagination = data?.data?.data?.pagination;
  const departments = filtersRes?.data?.data?.departments || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, ID, roll no, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="input pl-8 pr-8 w-44"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setEditingStudent(null);
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Department / Course</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Admitted</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Users}
                      title="No students found"
                      description="Try adjusting your search or filters, or add a new student."
                    />
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {s.photoUrl ? (
                          <img src={`${BASE_URL}${s.photoUrl}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold">
                            {initials(s.firstName, s.lastName)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{s.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {s.department}
                      <br />
                      <span className="text-xs text-slate-400">
                        {s.course} - {s.branch}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      Sem {s.semester} - {s.section}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{s.mobile}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(s.admissionDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => {
                            setEditingStudent(s);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="px-5 pb-4">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </div>
        )}
      </Card>

      <StudentFormModal open={modalOpen} onClose={() => setModalOpen(false)} student={editingStudent} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete student?"
        description={`This will permanently remove ${deleteTarget?.firstName} ${deleteTarget?.lastName} and all associated fee records.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};

export default StudentsPage;
