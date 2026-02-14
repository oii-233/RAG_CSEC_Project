import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { Icons } from '../constants';

const AdminUserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        const result = await authService.getAllUsers();
        if (result.success && result.data) {
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

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-[#0F2A3D] tracking-tighter uppercase">User Management</h1>
                    <p className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-widest mt-1">Manage platform access & roles</p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">System Online</span>
                </div>
            </div>

            {/* User Management Table */}
            <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-[#0F2A3D] uppercase tracking-widest text-[10px] md:text-xs">Registered Users</h3>
                    <button 
                        onClick={fetchUsers} 
                        className="text-[10px] font-black uppercase tracking-widest text-[#17A2B8] hover:underline flex items-center gap-2"
                    >
                        <Icons.Refresh size={14}/> Refresh List
                    </button>
                </div>
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
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${user.isActive
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

export default AdminUserManagement;
