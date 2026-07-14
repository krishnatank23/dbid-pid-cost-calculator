import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DbidPidCalculator from './components/DbidPidCalculator';
import ScfCalculator from './components/ScfCalculator';
import DbtlCalculator from './components/DbtlCalculator';

export default function App() {
  const [activePage, setActivePage] = useState('page1');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });
  const [toasts, setToasts] = useState([]);

  // Apply theme & page class to document body
  useEffect(() => {
    const body = document.body;
    if (theme === 'light') {
      body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }

    body.classList.remove('mode-dbid', 'mode-pid', 'mode-dbtl');
    if (activePage === 'page1') {
      body.classList.add('mode-dbid');
    } else if (activePage === 'page2') {
      body.classList.add('mode-pid');
    } else if (activePage === 'page3') {
      body.classList.add('mode-dbtl');
    }
  }, [theme, activePage]);

  // SCF strictly locks theme to dark mode as per original spec
  useEffect(() => {
    if (activePage === 'page2') {
      setTheme('dark');
    }
  }, [activePage]);

  // Toast Notification Dispatcher
  const triggerToast = (title, desc) => {
    // Prevent duplicate toasts from spamming
    if (toasts.some((t) => t.desc === desc)) return;

    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, desc }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const renderActiveCalculator = () => {
    switch (activePage) {
      case 'page1':
        return <DbidPidCalculator triggerToast={triggerToast} />;
      case 'page2':
        return <ScfCalculator triggerToast={triggerToast} />;
      case 'page3':
        return <DbtlCalculator triggerToast={triggerToast} />;
      default:
        return <DbidPidCalculator triggerToast={triggerToast} />;
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-x-hidden bg-black text-white font-body">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute rounded-full pointer-events-none transition-all duration-1000 top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,#FFCB05_0%,rgba(0,0,0,0.3)_70%)] opacity-95 blur-[120px] animate-float-glow-1 z-[-1]"></div>
      <div className="absolute rounded-full pointer-events-none transition-all duration-1000 top-[20%] right-[-10%] w-[700px] h-[700px] bg-[radial-gradient(circle,#1068B2_0%,rgba(0,0,0,0.3)_70%)] opacity-95 blur-[120px] animate-float-glow-2 z-[-1]"></div>
      <div className="absolute rounded-full pointer-events-none transition-all duration-1000 top-[40%] left-[45%] w-[350px] h-[350px] bg-secondary/[0.08] opacity-40 blur-[140px] z-[-1]"></div>

      {/* Navigation Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Dashboard Content Container */}
      <main className="ml-0 lg:ml-[280px] flex-1 p-6 md:p-10 lg:p-12 min-h-screen transition-all duration-500">
        {/* Top Bar Header */}
        <Header activePage={activePage} theme={theme} setTheme={setTheme} />

        {/* Calculator Section wrapper */}
        {renderActiveCalculator()}
      </main>

      {/* Toast Notification Container */}
      <div className="fixed top-8 right-8 z-[2000] flex flex-col gap-3.5 max-w-sm pointer-events-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="flex items-center gap-3 p-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl cursor-pointer transition-all duration-300 animate-slide-down-fade hover:bg-neutral-800"
          >
            <div className="text-wofi-blue flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-bold text-white leading-tight">{toast.title}</span>
              <span className="text-[11px] text-neutral-400 font-medium mt-0.5 leading-normal">{toast.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
