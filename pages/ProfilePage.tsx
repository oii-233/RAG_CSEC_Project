import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Icons } from '../constants';

interface ProfilePageProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(user.bio || '');
    const [password, setPassword] = useState('');

    const handleSave = () => {
        // In a real app, this would call an API to update the user
        onUpdateUser({ ...user, bio });
        setIsEditing(false);
        setPassword(''); // Reset password field
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-[#0F2A3D] uppercase tracking-tighter">My Profile</h1>
                    <p className="text-gray-400 font-bold text-sm tracking-widest mt-1">Manage your account settings</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-[#17A2B8] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:shadow-lg transition-all"
                    >
                        <Icons.Settings /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs text-gray-400 hover:text-gray-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-[#0F2A3D] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:shadow-lg transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-40 h-40 rounded-full bg-gray-100 border-4 border-white shadow-xl overflow-hidden relative group">
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                                <Icons.User className="w-20 h-20" />
                            </div>
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${user.role === UserRole.ADMIN ? 'bg-[#17A2B8]/10 text-[#17A2B8]' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {user.role}
                            </span>
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="flex-1 space-y-8 w-full">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="w-full px-6 py-4 rounded-2xl bg-gray-50/50 border border-gray-100 font-bold text-[#0F2A3D]">
                                    {user.name}
                                </div>
                            </div>

                            {user.universityId && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">University ID</label>
                                    <div className="w-full px-6 py-4 rounded-2xl bg-gray-50/50 border border-gray-100 font-bold text-[#0F2A3D]">
                                        {user.universityId}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Institutional Email</label>
                            <div className="w-full px-6 py-4 rounded-2xl bg-gray-50/50 border border-gray-100 font-bold text-[#0F2A3D]">
                                {user.email}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio</label>
                            {isEditing ? (
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us a bit about yourself..."
                                    rows={4}
                                    className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#17A2B8] outline-none transition-all font-medium text-gray-600 resize-none"
                                />
                            ) : (
                                <div className={`w-full px-6 py-4 rounded-2xl bg-gray-50/50 border border-gray-100 font-medium ${!user.bio ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                                    {user.bio || 'No bio provided yet.'}
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Change Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="New Password (leave empty to keep current)"
                                    className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#17A2B8] outline-none transition-all font-bold text-[#0F2A3D]"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
