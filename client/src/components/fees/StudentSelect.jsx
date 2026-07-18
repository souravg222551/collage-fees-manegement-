import React, { useState, useEffect, useRef } from 'react';
import { Search, X, UserCheck } from 'lucide-react';
import { studentApi } from '../../api/services';
import useDebounce from '../../hooks/useDebounce';
import { initials } from '../../utils/format';
import { BASE_URL } from '../../api/client';

const StudentSelect = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 300);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    studentApi.list({ search: debounced, limit: 8 }).then((res) => {
      setResults(res.data.data.students);
    });
  }, [debounced]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10">
        {value.photoUrl ? (
          <img src={`${BASE_URL}${value.photoUrl}`} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold">
            {initials(value.firstName, value.lastName)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {value.firstName} {value.lastName}
          </p>
          <p className="text-xs text-slate-500">
            {value.studentId} &middot; {value.department} &middot; Sem {value.semester}
          </p>
        </div>
        <UserCheck size={16} className="text-brand-600" />
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded hover:bg-white/60 dark:hover:bg-slate-800">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        className="input pl-9"
        placeholder="Search student by name, ID, or roll number..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full card p-1.5 max-h-64 overflow-y-auto">
          {results.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                onChange(s);
                setOpen(false);
                setQuery('');
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
            >
              {s.photoUrl ? (
                <img src={`${BASE_URL}${s.photoUrl}`} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold">
                  {initials(s.firstName, s.lastName)}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {s.firstName} {s.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {s.studentId} &middot; {s.department}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSelect;
