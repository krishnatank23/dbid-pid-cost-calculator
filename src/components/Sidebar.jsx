import React from 'react';

export default function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    {
      id: 'page1',
      title: 'DBID-PID',
      subtitle: '(Distributor/Purchase Invoice Discounting)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="9" y1="9" x2="21" y2="9" />
          <line x1="9" y1="15" x2="21" y2="15" />
        </svg>
      )
    },
    {
      id: 'page2',
      title: 'SCF',
      subtitle: '(Supply Chain Finance)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'page3',
      title: 'DBTL',
      subtitle: '(Distributor Term Loan)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    }
  ];

  return (
    <aside className="w-[280px] bg-[rgba(6,6,6,0.92)] border-r border-[#ACACAC33] p-8 flex flex-col fixed top-0 bottom-0 left-0 z-[100] backdrop-blur-[20px] transition-all duration-500 max-[992px]:w-full max-[992px]:h-auto max-[992px]:relative max-[992px]:border-r-0 max-[992px]:border-b max-[992px]:border-[#ACACAC33] max-[992px]:p-5 max-[992px]:flex-row max-[992px]:items-center max-[992px]:justify-between">
      {/* Brand logo */}
      <div className="flex items-center gap-3 mb-12 max-[992px]:mb-0">
        <div className="flex items-center justify-start transition-transform duration-500 hover:scale-[1.05]">
          <img src="/Wofi Blue.png" alt="Wofi Logo" className="h-14 w-auto object-contain" />
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex flex-col gap-2 flex-1 max-[992px]:flex-row max-[992px]:gap-1.5 max-[992px]:flex-initial max-[600px]:hidden">
        {menuItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`group flex items-center gap-3.5 p-3.5 px-4 rounded-2xl text-gray-text text-sm font-medium transition-all duration-200 relative border border-transparent hover:text-white hover:bg-white/[0.03] max-[992px]:p-2.5 max-[992px]:px-3 ${isActive ? 'bg-secondary/[0.08] !border-secondary/15 shadow-[inset_0_0_15px_rgba(16,104,178,0.08)] !text-white' : ''
                }`}
            >
              {isActive && (
                <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-secondary rounded-r-md transition-all duration-300" />
              )}

              <div className={`flex items-center justify-center transition-colors duration-200 ${isActive ? 'text-secondary drop-shadow-[0_0_8px_rgba(16,104,178,0.5)]' : 'text-secondary'}`}>
                {item.icon}
              </div>

              <div className="flex flex-col gap-0.5 items-start max-[992px]:hidden">
                <span className={`font-bold text-[13.5px] transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-text group-hover:text-white'}`}>{item.title}</span>
                <span className="text-[11.5px] text-gray-light font-medium mt-0.5">{item.subtitle}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
