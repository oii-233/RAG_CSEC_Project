
import React from 'react';
import { Icons, COLORS } from '../constants';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onReportClick: () => void;
  isOpen?: boolean;
  onToggle?: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, onTabChange, onLogout, onReportClick, isOpen, onToggle }) => {
  const menuItems = role === UserRole.ADMIN ? [
    { id: 'admin-dashboard', label: 'Dashboard', icon: Icons.Layout },
    { id: 'admin-reports', label: 'Incident Registry', icon: Icons.Alert },
    { id: 'admin-rag', label: 'Knowledge Base', icon: Icons.Book },
    { id: 'admin-analytics', label: 'Analytics', icon: Icons.BarChart },
    { id: 'profile', label: 'My Profile', icon: Icons.User },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Layout },
    { id: 'notifications', label: 'Safety Alerts', icon: Icons.Bell },
    { id: 'profile', label: 'My Profile', icon: Icons.User },
  ];

  const handleNavClick = (id: string) => {
    onTabChange(id);
    if (onToggle) onToggle(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden transition-opacity duration-300"
          onClick={() => onToggle?.(false)}
        />
      )}

      <aside className={`w-64 bg-[#17A2B8] text-white h-screen fixed left-0 top-0 flex flex-col z-50 shadow-2xl transition-transform duration-300 transform border-r border-white/10 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icons.ASTULogo className="w-8 h-8 rounded-lg object-cover bg-white" />
            <div className="font-black text-white text-sm leading-none tracking-tighter uppercase">
              ዘብ AI <br />
              <span className="text-white/80 text-[10px] tracking-widest">Smart Safety</span>
            </div>
          </div>
          <button
            onClick={() => onToggle?.(false)}
            className="md:hidden p-2 text-white/80 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 mt-8 px-4 space-y-2 overflow-y-auto">
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === item.id
                ? 'bg-white/20 text-white'
                : 'text-white hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-white/10 space-y-4">
          <div className="bg-black/20 p-4 rounded-xl border border-white/10">
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-1">Emergency</p>
            <p className="text-sm font-bold text-white">+251 924 62 14 07</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-100 hover:text-red-200 hover:bg-white/10 rounded-xl transition-colors font-bold text-sm"
          >
            <Icons.LogOut />
            <span>Secure Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
