
import React, { useState, useEffect } from 'react';
import { UserRole, User, Report, ReportStatus, ReportType } from './types';
import { authService } from './services/authService';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase';
import ManageReports from './pages/ManageReports';
import ChatBot from './components/ChatBot';
import Sidebar from './components/Sidebar';
import { Icons } from './constants';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<'landing' | 'login' | 'app'>('landing');
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setView('app');
                setActiveTab(parsedUser.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const [reports, setReports] = useState<Report[]>([
        { id: 'ASTU-10234', type: ReportType.SECURITY, category: 'Suspicious Activity', description: 'Unattended bag in Library hall.', location: 'Main Library, 2nd Floor', priority: 'High', status: ReportStatus.OPEN, createdAt: '2024-03-20 10:30', userId: 'U1' },
        { id: 'ASTU-10235', type: ReportType.MAINTENANCE, category: 'Plumbing', description: 'Leaking pipe in Block C restroom.', location: 'Block C, Ground Floor', priority: 'Medium', status: ReportStatus.IN_REVIEW, createdAt: '2024-03-20 09:15', userId: 'U1' },
        { id: 'ASTU-10236', type: ReportType.SECURITY, category: 'Lost Item', description: 'Lost student ID near the cafeteria.', location: 'Cafeteria Entrance', priority: 'Low', status: ReportStatus.RESOLVED, createdAt: '2024-03-19 14:00', userId: 'U1' },
    ]);

    const handleLogin = async (role: UserRole, data?: any) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            let result;
            if (data.name) {
                // Signup
                result = await authService.signup({ ...data, role: role.toLowerCase() });
            } else {
                // Login
                result = await authService.login(data);
            }

            if (result.success && result.data) {
                const formattedUser = authService.formatUser(result.data.user);
                setUser(formattedUser);
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(formattedUser));
                setView('app');
                setActiveTab(formattedUser.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
            } else {
                setAuthError(result.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            setAuthError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setView('landing');
        setIsChatOpen(false);
    };

    const onAIReportGenerated = (data: any) => {
        const report: Report = {
            id: `ASTU-${Math.floor(10000 + Math.random() * 90000)}`,
            type: data.type,
            category: data.category,
            location: data.location,
            description: data.description,
            priority: data.priority || 'Medium',
            status: ReportStatus.OPEN,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            userId: user?.id || 'anonymous'
        };
        setReports(prev => [report, ...prev]);
    };

    const updateReportStatus = (id: string, status: ReportStatus) => {
        setReports(reports.map(r => r.id === id ? { ...r, status } : r));
    };

    const triggerAIReporting = () => {
        setIsChatOpen(true);
        if ((window as any).triggerAIReporting) {
            (window as any).triggerAIReporting();
        }
    };

    const renderContent = () => {
        if (!user) return null;

        if (user.role === UserRole.ADMIN) {
            switch (activeTab) {
                case 'admin-dashboard': return <AdminDashboard />;
                case 'admin-reports': return <ManageReports reports={reports} updateStatus={updateReportStatus} />;
                case 'admin-upload': return <AdminKnowledgeBase />;
                case 'admin-users': return <AdminUserManagement />;
                case 'profile': return <ProfilePage user={user} onUpdateUser={setUser} />;
                default: return <AdminDashboard />;
            }
        } else {
            switch (activeTab) {
                case 'dashboard': return <StudentDashboard user={user} reports={reports} onReportClick={triggerAIReporting} />;
                case 'notifications': return (
                    <div className="bg-white p-20 rounded-[48px] shadow-sm border border-gray-100 text-center max-w-4xl mx-auto">
                        <div className="text-[#17A2B8] scale-150 mb-8 flex justify-center"><Icons.Bell /></div>
                        <h3 className="text-2xl font-black text-[#0F2A3D] uppercase tracking-tighter">Emergency Broadcasts</h3>
                        <p className="text-gray-400 font-bold text-sm mt-4 uppercase tracking-widest italic">No critical safety alerts have been issued in the current cycle.</p>
                    </div>
                );
                case 'profile': return <ProfilePage user={user} onUpdateUser={setUser} />;
                default: return <StudentDashboard user={user} reports={reports} onReportClick={triggerAIReporting} />;
            }
        }
    };

    useEffect(() => {
        const handleOpenChat = () => setIsChatOpen(true);
        window.addEventListener('open-chatbot', handleOpenChat);
        return () => window.removeEventListener('open-chatbot', handleOpenChat);
    }, []);

    if (isLoading) return <LoadingScreen role={UserRole.STUDENT} isLoading={isLoading} />;
    if (view === 'landing') return <LandingPage onGetStarted={() => setView('login')} />;
    if (view === 'login') return (
        <LoginPage
            onLogin={handleLogin}
            onBack={() => {
                setView('landing');
                setAuthError(null);
            }}
            error={authError}
            isLoading={isLoading}
        />
    );

    return (
        <div className="flex h-screen bg-[#F4F8FA] font-sans text-[#1F2933] overflow-hidden">
            <Sidebar
                role={user?.role || UserRole.STUDENT}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onLogout={handleLogout}
                onReportClick={triggerAIReporting}
                isOpen={isMobileSidebarOpen}
                onToggle={setIsMobileSidebarOpen}
            />
            <main className="flex-1 md:ml-64 overflow-y-auto relative min-h-screen">
                {/* Institutional Background Element */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.015] flex items-center justify-center">
                    <div className="scale-[5]"><Icons.ASTULogo /></div>
                </div>

                <header className="h-20 md:h-24 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-4 md:px-12 sticky top-0 z-40 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Icons.Layout />
                        </button>
                        <div className="h-8 md:h-10 w-1 bg-[#17A2B8] rounded-full hidden sm:block"></div>
                        <span className="font-black text-[#0F2A3D] text-lg md:text-2xl uppercase tracking-tighter truncate max-w-[150px] sm:max-w-none">
                            {activeTab.replace('admin-', '').replace('-', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <div className="text-sm font-black text-[#0F2A3D] tracking-tight">{user?.name}</div>
                            <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                {user?.role === UserRole.ADMIN ? 'ADMIN' : user?.universityId}
                            </div>
                        </div>
                        <div className="bg-[#F4F8FA] p-3 rounded-2xl border border-gray-100 shadow-inner text-[#17A2B8]">
                            <Icons.User />
                        </div>
                    </div>
                </header>

                <div className="p-12 relative z-10">
                    {renderContent()}
                </div>
            </main>
            <ChatBot user={user!} isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
        </div>
    );
};

interface LoadingScreenProps {
    role: UserRole;
    isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ role, isLoading }) => (
    <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-[#17A2B8]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#17A2B8] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-sm font-black text-[#0F2A3D] uppercase tracking-widest animate-pulse">
                Initializing Security Node...
            </div>
        </div>
    </div>
);

export default App;
