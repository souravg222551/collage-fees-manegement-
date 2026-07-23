import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, KeyRound, UserCircle, Users, Plus, Ban, CheckCircle2, Trash2, Layers, Pencil } from 'lucide-react';
import { settingsApi, authApi, adminApi, feeStructureApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Card, Field, Spinner, EmptyState } from '../components/ui/Primitives';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FEE_TYPES, FEE_TYPE_LABELS, FREQUENCIES, FREQUENCY_LABELS } from '../utils/feeConstants';
import { formatCurrency } from '../utils/format';

const SettingsPage = () => {
  const { admin } = useAuth();
  const canManageInstitution = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  const TABS = [
    canManageInstitution && { key: 'institution', label: 'Institution Settings', icon: Building2 },
    canManageInstitution && { key: 'fee-structure', label: 'Fee Structure', icon: Layers },
    isSuperAdmin && { key: 'admins', label: 'Manage Admins', icon: Users },
    { key: 'profile', label: 'My Profile', icon: UserCircle },
    { key: 'password', label: 'Change Password', icon: KeyRound },
  ].filter(Boolean);

  const [tab, setTab] = useState(TABS[0]?.key || 'profile');

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'institution' && canManageInstitution && <InstitutionSettingsForm />}
      {tab === 'fee-structure' && canManageInstitution && <FeeStructureEditor />}
      {tab === 'admins' && isSuperAdmin && <AdminManagement />}
      {tab === 'profile' && <ProfileForm />}
      {tab === 'password' && <PasswordForm />}
    </div>
  );
};

const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', ACCOUNTANT: 'Accountant' };

const FeeStructureEditor = () => {
  const queryClient = useQueryClient();
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const settings = settingsData?.data?.data;

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['fee-structure', 'groups'],
    queryFn: feeStructureApi.groups,
    enabled: Boolean(settings),
  });
  const groups = groupsData?.data?.data?.groups || [];
  const institutionType = groupsData?.data?.data?.institutionType;

  const [academicSession, setAcademicSession] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [editingId, setEditingId] = useState(null); // null = not adding; 'new' = add form; id = editing that row
  const [form, setForm] = useState({ feeType: 'TUITION', label: '', amount: '', frequency: 'ANNUAL', isOptional: false });
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (settings?.currentSession && !academicSession) setAcademicSession(settings.currentSession);
  }, [settings, academicSession]);

  const { data: structureData, isFetching: structureLoading } = useQuery({
    queryKey: ['fee-structure', academicSession, groupLabel],
    queryFn: () => feeStructureApi.get(academicSession, groupLabel),
    enabled: Boolean(academicSession && groupLabel),
  });

  const items = structureData?.data?.data?.items || [];
  const grandTotal = items.filter((i) => !i.isOptional).reduce((sum, i) => sum + Number(i.amount), 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fee-structure'] });

  const addMutation = useMutation({
    mutationFn: () => feeStructureApi.addItem({ academicSession, groupLabel, ...form, amount: Number(form.amount) || 0 }),
    onSuccess: () => {
      toast.success('Fee item added');
      invalidate();
      setEditingId(null);
      setForm({ feeType: 'TUITION', label: '', amount: '', frequency: 'ANNUAL', isOptional: false });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add fee item'),
  });

  const updateMutation = useMutation({
    mutationFn: (id) => feeStructureApi.updateItem(id, { ...form, amount: Number(form.amount) || 0 }),
    onSuccess: () => {
      toast.success('Fee item updated');
      invalidate();
      setEditingId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update fee item'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => feeStructureApi.removeItem(id),
    onSuccess: () => {
      toast.success('Fee item removed');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove fee item'),
  });

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ feeType: item.feeType, label: item.label || '', amount: item.amount, frequency: item.frequency, isOptional: item.isOptional });
  };

  const startAdd = () => {
    setEditingId('new');
    setForm({ feeType: 'TUITION', label: '', amount: '', frequency: 'ANNUAL', isOptional: false });
  };

  const syncMutation = useMutation({
    mutationFn: () => feeStructureApi.syncCharges(),
    onSuccess: (res) => {
      const count = res?.data?.data?.billedCount ?? 0;
      toast.success(count > 0 ? `Created ${count} missing billing record(s)` : 'Everything is already in sync');
      queryClient.invalidateQueries();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Sync failed'),
  });

  return (
    <div className="space-y-4">
      <Card className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-2">
          <p className="text-xs text-slate-500 max-w-md">
            If a fee category was added before a student existed in its group (or vice versa), that student may be
            missing a billing record — which can make Reports and this student's Fee Breakdown disagree. Sync fixes
            this for everyone at once; safe to run anytime.
          </p>
          <button className="btn-secondary text-xs shrink-0" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Sync Missing Charges'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          <Field label="Academic Session" required>
            <input className="input" value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} />
          </Field>
          <Field label={institutionType === 'SCHOOL' ? 'Class' : 'Course + Semester'} required>
            <select className="input" value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} disabled={groupsLoading}>
              <option value="">{groupsLoading ? 'Loading...' : 'Select group'}</option>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.display}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {groups.length === 0 && !groupsLoading && (
          <p className="text-xs text-slate-500">
            No students exist yet for this institution type — add a student first, then its group will appear here.
          </p>
        )}
      </Card>

      {academicSession && groupLabel && (
        <Card className="max-w-3xl p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              Fee Items — {groups.find((g) => g.value === groupLabel)?.display} ({academicSession})
            </h3>
            <button className="btn-secondary text-xs" onClick={startAdd}>
              <Plus size={14} /> Add Fee Item
            </button>
          </div>

          {structureLoading ? (
            <div className="p-5">
              <Spinner className="w-5 h-5 text-brand-600" />
            </div>
          ) : (
            <>
              {editingId === 'new' && (
                <FeeItemForm form={form} setForm={setForm} onSave={() => addMutation.mutate()} onCancel={() => setEditingId(null)} saving={addMutation.isPending} />
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 && editingId !== 'new' && (
                  <p className="p-5 text-sm text-slate-500">No fee items yet — click "Add Fee Item" to start.</p>
                )}
                {items.map((item) =>
                  editingId === item.id ? (
                    <FeeItemForm
                      key={item.id}
                      form={form}
                      setForm={setForm}
                      onSave={() => updateMutation.mutate(item.id)}
                      onCancel={() => setEditingId(null)}
                      saving={updateMutation.isPending}
                    />
                  ) : (
                    <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.label || FEE_TYPE_LABELS[item.feeType]}
                        </p>
                        <p className="text-xs text-slate-500">
                          {FREQUENCY_LABELS[item.frequency]}
                          {item.isOptional && ' · Optional (students opt in individually)'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.amount)}
                        </span>
                        <button className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(item)}>
                          <Pencil size={13} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 font-semibold text-slate-800 dark:text-white">
                <span>Grand Total (required items only)</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <p className="px-5 pb-4 text-xs text-slate-500 -mt-2">
                Optional items (like Transport) aren't included above — add them per-student from that student's page once
                they opt in.
              </p>
            </>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this fee item?"
        description={`This removes "${deleteTarget?.label || FEE_TYPE_LABELS[deleteTarget?.feeType]}" from this group's fee structure.`}
        confirmLabel="Remove"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};

const FeeItemForm = ({ form, setForm, onSave, onCancel, saving }) => (
  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Category">
        <select className="input" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
          {FEE_TYPES.map((t) => (
            <option key={t} value={t}>
              {FEE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Display Name (optional override)">
        <input
          className="input"
          placeholder={FEE_TYPE_LABELS[form.feeType]}
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
      </Field>
      <Field label="Amount (₹)" required>
        <input
          type="number"
          min="0"
          step="0.01"
          className="input"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </Field>
      <Field label="Frequency">
        <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </select>
      </Field>
    </div>
    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        checked={form.isOptional}
        onChange={(e) => setForm({ ...form, isOptional: e.target.checked })}
      />
      Optional — not every student pays this (e.g. Transport). Excluded from the class Grand Total; add it to specific
      students individually.
    </label>
    <div className="flex gap-2">
      <button className="btn-primary" onClick={onSave} disabled={saving}>
        {saving ? <Spinner className="w-4 h-4" /> : 'Save'}
      </button>
      <button className="btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  </div>
);

const InstitutionSettingsForm = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const settings = data?.data?.data;

  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (payload) => {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && !['id', 'updatedAt', 'logoUrl', 'logoPublicId'].includes(k)) {
          fd.append(k, v);
        }
      });
      if (logoFile) fd.append('logo', logoFile);
      return settingsApi.update(fd);
    },
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setLogoFile(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update settings'),
  });

  if (isLoading || !form) {
    return (
      <Card>
        <div className="flex items-center justify-center py-10">
          <Spinner className="w-6 h-6 text-brand-600" />
        </div>
      </Card>
    );
  }

  const isSchool = form.institutionType === 'SCHOOL';

  return (
    <Card>
      <form
        className="space-y-5 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <Field label="Institution Type" required>
          <div className="grid grid-cols-2 gap-3">
            {['COLLEGE', 'SCHOOL'].map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setForm({ ...form, institutionType: type })}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.institutionType === type
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {type === 'COLLEGE' ? 'College / University' : 'School'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Switches student forms between {isSchool ? 'Department/Course/Semester' : 'Class/Grade/Stream'} and{' '}
            {isSchool ? 'Class/Grade/Stream' : 'Department/Course/Semester'} fields.
          </p>
        </Field>

        <div className="flex items-center gap-4">
          <img
            src={logoFile ? URL.createObjectURL(logoFile) : settings.logoUrl || 'https://placehold.co/64x64?text=Logo'}
            alt="Institution logo"
            className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
          />
          <div>
            <label className="btn-secondary cursor-pointer text-xs">
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <Field label="Institution Name" required>
          <input
            className="input"
            value={form.collegeName || ''}
            onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
          />
        </Field>

        <Field label="Address">
          <input
            className="input"
            value={form.collegeAddress || ''}
            onChange={(e) => setForm({ ...form, collegeAddress: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              className="input"
              value={form.collegePhone || ''}
              onChange={(e) => setForm({ ...form, collegePhone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              value={form.collegeEmail || ''}
              onChange={(e) => setForm({ ...form, collegeEmail: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Academic Session" required>
            <input
              className="input"
              value={form.currentSession || ''}
              onChange={(e) => setForm({ ...form, currentSession: e.target.value })}
            />
          </Field>
          <Field label="Receipt Prefix" required>
            <input
              className="input"
              value={form.receiptPrefix || ''}
              onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Authorized Signatory (shown on receipts)">
          <input
            className="input"
            value={form.authorizedSignatory || ''}
            onChange={(e) => setForm({ ...form, authorizedSignatory: e.target.value })}
          />
        </Field>

        <div className="pt-2">
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="w-4 h-4" /> : 'Save Settings'}
          </button>
        </div>
      </form>
    </Card>
  );
};

const AdminManagement = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ACCOUNTANT' });

  const { data, isLoading } = useQuery({ queryKey: ['admins'], queryFn: adminApi.list });
  const admins = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: () => adminApi.create(form),
    onSuccess: () => {
      toast.success('Admin account created');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'ACCOUNTANT' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create admin'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminApi.setStatus(id, isActive),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.remove(id),
    onSuccess: () => {
      toast.success('Admin account deleted');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete admin'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowCreate((s) => !s)}>
          <Plus size={16} /> {showCreate ? 'Cancel' : 'New Admin / Accountant'}
        </button>
      </div>

      {showCreate && (
        <Card className="max-w-xl">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <Field label="Full Name" required>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Temporary Password" required>
              <input
                type="text"
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </Field>
            <Field label="Role" required>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ACCOUNTANT">Accountant — fee collection only</option>
                <option value="ADMIN">Admin — full access except managing admins</option>
              </select>
            </Field>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Create Account'}
            </button>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center">
                    <Spinner className="w-5 h-5 mx-auto text-brand-600" />
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Users} title="No admins yet" description="Create your first Admin or Accountant account." />
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{a.name}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{a.email}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{ROLE_LABELS[a.role] || a.role}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${
                          a.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {a.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {a.role !== 'SUPER_ADMIN' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title={a.isActive ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => statusMutation.mutate({ id: a.id, isActive: !a.isActive })}
                          >
                            {a.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                          </button>
                          <button
                            title="Delete"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete admin account?"
        description={`This permanently removes ${deleteTarget?.name}'s login access.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};

const ProfileForm = () => {
  const { admin, refresh } = useAuth();
  const [name, setName] = useState(admin?.name || '');
  const [avatarFile, setAvatarFile] = useState(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('name', name);
      if (avatarFile) fd.append('avatar', avatarFile);
      return authApi.updateProfile(fd);
    },
    onSuccess: async () => {
      toast.success('Profile updated');
      setAvatarFile(null);
      await refresh();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update profile'),
  });

  return (
    <Card className="max-w-xl">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-500/10 flex items-center justify-center text-brand-700 dark:text-brand-400 font-semibold text-lg overflow-hidden">
            {avatarFile ? (
              <img src={URL.createObjectURL(avatarFile)} alt="avatar" className="w-full h-full object-cover" />
            ) : admin?.avatarUrl ? (
              <img src={admin.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              admin?.name?.[0]?.toUpperCase() || 'A'
            )}
          </div>
          <label className="btn-secondary cursor-pointer text-xs">
            Change Avatar
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files[0])} />
          </label>
        </div>

        <Field label="Full Name" required>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Email">
          <input className="input bg-slate-50 dark:bg-slate-800" value={admin?.email || ''} disabled />
        </Field>

        <Field label="Role">
          <input className="input bg-slate-50 dark:bg-slate-800" value={ROLE_LABELS[admin?.role] || admin?.role || ''} disabled />
        </Field>

        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner className="w-4 h-4" /> : 'Save Profile'}
        </button>
      </form>
    </Card>
  );
};

const PasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    mutation.mutate();
  };

  return (
    <Card className="max-w-xl">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Field label="Current Password" required>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="New Password" required>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm New Password" required>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner className="w-4 h-4" /> : 'Update Password'}
        </button>
      </form>
    </Card>
  );
};

export default SettingsPage;
