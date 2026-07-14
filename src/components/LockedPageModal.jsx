import React from 'react';

export default function LockedPageModal({ isOpen, title, description, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[500px] bg-neutral-900 border border-wofi-blue/20 rounded-3xl p-10 text-center relative transform translate-y-0 transition-transform duration-300 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div 
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 text-neutral-400 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
          onClick={onClose}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        {/* Lock Illustration */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-wofi-blue/10 border border-wofi-blue flex items-center justify-center text-wofi-blue shadow-[0_0_15px_rgba(16,104,178,0.25)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading text-xl font-bold text-white mb-3">{title}</h3>

        {/* Description */}
        <p className="text-neutral-400 text-sm leading-relaxed mb-6">{description}</p>

        {/* Features Preview */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs text-neutral-300">Fully Custom Logic</span>
          <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs text-neutral-300">Premium UI Design</span>
          <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs text-neutral-300">Connected State</span>
        </div>

        {/* Action Button */}
        <button 
          className="w-full h-12 bg-wofi-blue hover:bg-wofi-blue/80 text-white font-bold rounded-xl flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          Understood, Let's Define It Next
        </button>
      </div>
    </div>
  );
}
