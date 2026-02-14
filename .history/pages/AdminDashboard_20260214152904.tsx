
import React, { useState, useEffect } from 'react';
import { Report, ReportStatus, ReportType, User } from '../types';
import { Icons } from '../constants';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface AdminDashboardProps {
  reports: Report[];
  onManageAll?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ }) => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalTextUploads, setTotalTextUploads] = useState(0);
  const [totalFilesUploads, setTotalFilesUploads] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        // Fetch Users
        const userRes = await authService.getAllUsers();
        if (userRes.success && userRes.data) {
            setTotalUsers(userRes.data.length);
        }

        // Fetch Documents
        const docRes = await chatService.getDocuments();
        if (docRes.success && docRes.data) {
            const docs = docRes.data.documents;
            setTotalTextUploads(docs.filter((d: any) => !d.title.toLowerCase().endsWith('.pdf') && !d.title.toLowerCase().endsWith('.doc') && !d.title.toLowerCase().endsWith('.docx')).length);
            setTotalFilesUploads(docs.filter((d: any) => d.title.toLowerCase().endsWith('.pdf') || d.title.toLowerCase().endsWith('.doc') || d.title.toLowerCase().endsWith('.docx')).length);
        }
    };
    fetchData();
  }, []);
  
  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Icons.User, color: 'text-blue-600' },
    { label: 'Uploaded Texts', value: totalTextUploads, icon: Icons.Book, color: 'text-green-600' },
    { label: 'Uploaded Files', value: totalFilesUploads, icon: Icons.Book, color: 'text-[#17A2B8]' },
  ];

  const chartData = [
    { name: 'Users', value: totalUsers },
    { name: 'Texts', value: totalTextUploads },
    { name: 'Files', value: totalFilesUploads },
  ];

  const COLORS = ['#2563EB', '#16A34A', '#17A2B8'];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 md:px-0">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
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
        {/* Chart Section */}
        <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="font-black text-[#0F2A3D] uppercase tracking-widest text-[10px] md:text-xs mb-8">System Overview</h3>
            <div className="h-80 w-full flex flex-col items-center">
                <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={chartData} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={80} 
                                outerRadius={110} 
                                paddingAngle={5} 
                                dataKey="value"
                            >
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '16px', backgroundColor: '#0F2A3D', border: 'none', color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-8 mt-6">
                    {chartData.map((d, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500">{d.name}: {d.value}</span>
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
    </div>
  );
};

export default AdminDashboard;
