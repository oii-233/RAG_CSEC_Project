
import React, { useState, useEffect } from 'react';
import { Report, ReportStatus, ReportType, User, UserRole } from '../types';
import { Icons } from '../constants';
import { authService } from '../services/authService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface AdminDashboardProps {
  reports: Report[];
  onManageAll?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ reports, onManageAll }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const result = await authService.getAllUsers();
    if (result.success && result.data) {
        // Backend returns raw user objects, assume they need formatting or are already OK.
        // authService.getAllUsers returns { success: true, data: [...] }
        // Let's assume the data is array of objects.
        // We might need to map them if formatUser is needed.
        // But let's check authService again. formatUser is not exported.
        // Wait, formatUser is inside authService object.
        const formattedUsers = result.data.map((u: any) => authService.formatUser(u));
        setUsers(formattedUsers);
    }
    setLoadingUsers(false);
  };

  const handleToggleBan = async (user: User) => {
    if (!window.confirm(`Are you sure you want to ${user.isActive ? 'ban' : 'activate'} ${user.name}?`)) return;
    
    const result = await authService.toggleBanUser(user.id);
    if (result.success) {
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } else {
      alert('Failed to update user status');
    }
  };

  const stats = [
    { label: 'Total Logs', value: reports.length, icon: Icons.Layout, color: 'text-blue-600' },
    { label: 'Active Alerts', value: reports.filter(r => r.status === ReportStatus.OPEN).length, icon: Icons.Alert, color: 'text-red-600' },
    { label: 'Closed Cases', value: reports.filter(r => r.status === ReportStatus.RESOLVED).length, icon: Icons.Shield, color: 'text-green-600' },
    { label: 'Security Ratio', value: `${Math.round((reports.filter(r => r.type === ReportType.SECURITY).length / reports.length) * 100)}%`, icon: Icons.Shield, color: 'text-[#17A2B8]' },
  ];

  const pieData = [
    { name: 'Security', value: reports.filter(r => r.type === ReportType.SECURITY).length },
    { name: 'Maintenance', value: reports.filter(r => r.type === ReportType.MAINTENANCE).length },
  ];

  const PIE_COLORS = ['#C62828', '#17A2B8'];

  const recentUrgent = reports.filter(r => r.priority === 'Critical' || r.priority === 'High').slice(0, 3);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 md:px-0">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-32 md:h-40">
            <div className="flex justify-between items-center">
              <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
              <div className={`${stat.color} opacity-80 scale-75`}><stat.icon /></div>
            </div>
            <div className="text-2xl md:text-4xl font-black text-[#0F2A3D] tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
        {/* Urgent Attention Node */}
        <div className="bg-white rounded-[32px] md:rounded-[48px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 md:p-10 border-b border-gray-50 flex justify-between items-center bg-red-50/20">
            <h3 className="font-black text-[#0F2A3D] uppercase tracking-widest text-[10px] md:text-xs">Priority Interventions</h3>
            <button onClick={onManageAll} className="text-[9px] md:text-[10px] font-black text-[#17A2B8] uppercase tracking-widest hover:underline">Full Registry</button>
          </div>
          <div className="flex-1 divide-y divide-gray-50">
            {recentUrgent.length > 0 ? recentUrgent.map((item, i) => (
              <div key={i} className="px-6 md:px-10 py-6 md:py-8 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex gap-4 md:gap-6 items-center min-w-0">
                  <div className="bg-red-100 p-2 md:p-3 rounded-2xl text-red-600 flex-shrink-0"><Icons.Alert /></div>
                  <div className="min-w-0">
                    <p className="font-black text-[#0F2A3D] leading-none mb-1 uppercase tracking-tight text-xs md:text-sm truncate">{item.category}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{item.location} • ID: {item.id}</p>
                  </div>
                </div>
                <span className="bg-red-600 text-white px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest flex-shrink-0">{item.priority}</span>
              </div>
            )) : (
              <div className="p-12 md:p-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs md:text-sm italic text-balance">Zero critical alerts logged</div>
            )}
          </div>
        </div>

        {/* Intelligence Breakdown */}
        <div className="bg-[#0F2A3D] p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-xl text-white">
          <h3 className="font-black uppercase tracking-widest text-[10px] md:text-xs mb-8 md:mb-10 text-gray-400">Departmental Distribution</h3>
          <div className="h-64 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', backgroundColor: '#0F2A3D', border: '1px solid #17A2B8', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-6">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }}></div>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-300 text-nowrap">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#17A2B8]/5 p-6 md:p-8 rounded-[24px] md:rounded-[40px] border border-[#17A2B8]/10 flex flex-col sm:flex-row items-center gap-4 md:gap-8 text-center sm:text-left">
        <div className="bg-[#17A2B8] text-white p-3 md:p-4 rounded-3xl flex-shrink-0"><Icons.Shield /></div>
        <div className="flex-1">
          <h4 className="font-black text-[#0F2A3D] uppercase tracking-widest text-[10px] md:text-xs mb-1">Administrative Note</h4>
          <p className="text-gray-500 text-xs md:text-sm font-medium leading-relaxed">System is performing real-time embedding sync with university databases. All logged sessions are recorded for audit compliance.</p>
        </div>
      </div>
      
      {/* User Management Section */}
      <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-gray-100">
        <h3 className="font-black text-[#0F2A3D] uppercase tracking-widest text-[10px] md:text-xs mb-8">User Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest">
                <th className="py-4 px-4 bg-gray-50/50 rounded-l-xl">Name</th>
                <th className="py-4 px-4 bg-gray-50/50">Email</th>
                <th className="py-4 px-4 bg-gray-50/50">Role</th>
                <th className="py-4 px-4 bg-gray-50/50">University ID</th>
                <th className="py-4 px-4 bg-gray-50/50">Status</th>
                <th className="py-4 px-4 bg-gray-50/50 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs md:text-sm">
                {users.length > 0 ? (
                    users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-[#0F2A3D]">{user.name}</td>
                            <td className="py-4 px-4 text-gray-500">{user.email}</td>
                            <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-gray-400 font-mono tracking-wider">{user.universityId}</td>
                            <td className="py-4 px-4">
                                <span className={`flex items-center gap-2 ${user.isActive ? 'text-green-600' : 'text-red-500'} font-bold text-[10px] uppercase tracking-widest`}>
                                    <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {user.isActive ? 'Active' : 'Banned'}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                                {user.role !== UserRole.ADMIN && (
                                    <button 
                                        onClick={() => handleToggleBan(user)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                            user.isActive 
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                    >
                                        {user.isActive ? 'Ban User' : 'Unban'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-medium italic">
                            {loadingUsers ? 'Loading users...' : 'No users found'}
                        </td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
