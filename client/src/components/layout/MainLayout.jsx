import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const TITLES = {
  '/': 'Dashboard',
  '/students': 'Students',
  '/fees': 'Fee Collection',
  '/receipts': 'Receipts',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const resolveTitle = (pathname) => {
  const match = Object.keys(TITLES).find((k) => (k === '/' ? pathname === '/' : pathname.startsWith(k)));
  return TITLES[match] || 'FeeAdmin';
};

const MainLayout = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header title={resolveTitle(location.pathname)} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto animate-fadeIn">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
