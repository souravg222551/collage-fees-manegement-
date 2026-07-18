import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, KeyRound, UserCircle } from 'lucide-react';
import { settingsApi, authApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Card, Field, Spinner } from '../components/ui/Primitives';

const TABS = [
  { key: 'college', label: 'College Settings', icon: Building2 },
  { key: 'profile', label: 'Admin Profile', icon: UserCircle },
  { key: 'password', label: 'Change Password', icon: KeyRound },
];

const SettingsPage = () => {
  const [tab, setTab] = useState('college');

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'college' && <CollegeSettingsForm />}
      {tab === 'profile' && <ProfileForm />}
      {tab === 'password' && <PasswordForm />}
    </div>
  );
};

const CollegeSettingsForm = () => {
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
        if (v !== null && v !== undefined && !['id', 'updatedAt', 'logoUrl'].includes(k)) fd.append(k, v);
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

  return (
    <Card>
      <form
        className="space-y-5 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="flex items-center gap-4">
          <img
            src={
              logoFile
                ? URL.createObjectURL(logoFile)
                : settings.logoUrl
                ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${settings.logoUrl}`
                : 'https://placehold.co/64x64?text=Logo'
            }
            alt="College logo"
            className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
          />
          <div>
            <label className="btn-secondary cursor-pointer text-xs">
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <Field label="College Name" required>
          <input
            className="input"
            value={form.collegeName || ''}
            onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
          />
        </Field>

        <Field label="College Address">
          <input
            className="input"
            value={form.collegeAddress || ''}
            onChange={(e) => setForm({ ...form, collegeAddress: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="College Phone">
            <input
              className="input"
              value={form.collegePhone || ''}
              onChange={(e) => setForm({ ...form, collegePhone: e.target.value })}
            />
          </Field>
          <Field label="College Email">
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
              <img
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${admin.avatarUrl}`}
                alt="avatar"
                className="w-full h-full object-cover"
              />
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
          <input className="input bg-slate-50 dark:bg-slate-800" value={admin?.role || ''} disabled />
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
