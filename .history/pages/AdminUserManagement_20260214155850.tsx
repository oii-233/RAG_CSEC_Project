import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { Icons, COLORS } from '../constants';

const AdminUserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const result = await authService.getAllUsers();
            if (result.success && result.data) {
                // Map backend users to frontend format
                const formattedUsers = result.data.map((u: any) => ({
                    id: u._id || u.id,
                    name: u.name,
                    email: u.email,
                    universityId: u.universityId,
                    role: u.role === 'admin' ? UserRole.ADMIN : UserRole.STUDENT,
                    isActive: u.isActive !== undefined ? u.isActive : true
                }));
                setUsers(formattedUsers);
            } else {
                setError('Failed to fetch users');
            }
        } catch (err) {
            setError('An error occurred while fetching users');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBan = async (userId: string) => {
        try {
            const result = await (authService as any).toggleBanUser(userId);
            if (result.success) {
                // Optimistically update UI
                setUsers(users.map(u => 
                    u.id === userId ? { ...u, isActive: !u.isActive } : u
                ));
            } else {
                alert('Failed to update user status');
            }
        } catch (err) {
            alert('Error updating user status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17A2B8]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
                <Icons.Alert className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-bold">Error Loading Users</h3>
                <p>{error}</p>
                <button 
                    onClick={fetchUsers}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-semibold"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-[#0F2A3D] tracking-tight mb-2">User Management</h1>
                    <p className="text-gray-500 font-medium">Manage student and staff access privileges.</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="bg-[#17A2B8]/10 p-2 rounded-full text-[#17A2B8]">
                        <Icons.User />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Users</div>
                        <div className="text-2xl font-black text-[#0F2A3D] leading-none">{users.length}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                <th className="px-8 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-8 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#17A2B8] to-[#138496] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#0F2A3D]">{user.name}</div>
                                                <div className="text-xs text-gray-400 font-medium">{user.email}</div>
                                                <div className="text-[10px] text-gray-300 font-mono mt-0.5 uppercase tracking-wide">{user.universityId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                            user.role === UserRole.ADMIN 
                                                ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                            user.isActive 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                : 'bg-red-50 text-red-600 border border-red-100'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            {user.isActive ? 'Active' : 'Banned'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => handleToggleBan(user.id)}
                                            disabled={user.role === UserRole.ADMIN} // Prevent banning admins
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all transform active:scale-95 ${
                                                user.isActive
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                        >
                                            {user.isActive ? 'Ban Access' : 'Restore Access'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUserManagement;
