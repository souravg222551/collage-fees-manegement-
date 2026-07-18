import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

const NotFoundPage = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center px-4">
    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <FileQuestion size={26} className="text-slate-400" />
    </div>
    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Page not found</h1>
    <p className="text-sm text-slate-500 mt-1">The page you're looking for doesn't exist.</p>
    <Link to="/" className="btn-primary mt-6">
      Back to Dashboard
    </Link>
  </div>
);

export default NotFoundPage;
