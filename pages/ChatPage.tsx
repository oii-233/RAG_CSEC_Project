
import React, { useState, useEffect, useRef } from 'react';
import { Icons, COLORS } from '../constants';
import { ChatMessage, User } from '../types';
import { chatService, Conversation } from '../services/chatService';

interface ChatPageProps {
    user: User;
}

const ChatPage: React.FC<ChatPageProps> = ({ user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // desktop collapse state
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    // Detect mobile for responsive behavior
    useEffect(() => {
        const onResize = () => {
            const m = window.innerWidth < 768;
            setIsMobile(m);
            if (!m) {
                setIsMobileSidebarOpen(false);
            }
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        const result = await chatService.getConversations();
        if (result.success && result.data) {
            setConversations(result.data.conversations);
        }
        setIsLoadingHistory(false);
    };

    const switchConversation = async (id: string) => {
        setIsTyping(true);
        setActiveConversationId(id);
        const result = await chatService.getMessagesByConversation(id);
        setIsTyping(false);

        if (result.success && result.data) {
            const fetchedMessages: ChatMessage[] = result.data.messages.map(msg => ({
                role: msg.role,
                text: msg.text,
                timestamp: new Date(msg.timestamp)
            }));
            setMessages(fetchedMessages);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        const result = await chatService.askQuestion(input, activeConversationId);

        setIsTyping(false);
        if (result.success && result.data) {
            const { answer, conversationId } = result.data;

            setMessages(prev => [...prev, {
                role: 'model',
                text: answer,
                timestamp: new Date()
            }]);

            // If it was a new conversation, update state and refresh list
            if (!activeConversationId) {
                setActiveConversationId(conversationId);
                loadHistory(); // Refresh sidebar to show new conversation
            }
        } else {
            setMessages(prev => [...prev, {
                role: 'model',
                text: result.message || "An error occurred while communicating with ዘብ AI.",
                timestamp: new Date()
            }]);
        }
    };

    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Delete this conversation?')) {
            const result = await chatService.deleteConversation(id);
            if (result.success) {
                setConversations(prev => prev.filter(c => c._id !== id));
                if (activeConversationId === id) {
                    startNewChat();
                }
            }
        }
    };

    const startNewChat = () => {
        setActiveConversationId(null);
        setMessages([]);
    };

    return (
        <div className="flex h-full bg-white overflow-hidden rounded-[24px] shadow-sm border border-gray-100 relative">
            {/* Desktop Sidebar (hidden on mobile) */}
            <div className={`hidden md:flex ${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-gray-50 border-r border-gray-100 flex-col overflow-hidden`}>
                <div className="p-4">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-[#0F2A3D] hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                    >
                        <Icons.Plus />
                        <span>New Chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2">Recent</div>
                    {isLoadingHistory ? (
                        <div className="flex justify-center p-8">
                            <div className="w-5 h-5 border-2 border-[#17A2B8]/30 border-t-[#17A2B8] rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        conversations.map(item => (
                            <button
                                key={item._id}
                                onClick={() => switchConversation(item._id)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all group relative border ${activeConversationId === item._id
                                    ? 'bg-white border-gray-200 shadow-sm'
                                    : 'hover:bg-white border-transparent hover:border-gray-100'
                                    }`}
                            >
                                <div className="text-sm font-bold text-[#0F2A3D] truncate pr-8 tracking-tight">{item.title}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                                    {new Date(item.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        onClick={(e) => handleDeleteConversation(e, item._id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 bg-[#17A2B8] rounded-lg flex items-center justify-center text-white text-xs font-black uppercase">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-[#0F2A3D] truncate">{user.name}</div>
                            <div className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase">{user.role} Access</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            {isMobile && isMobileSidebarOpen && (
                <div className="fixed inset-0 z-40 flex">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
                    <div className="relative w-72 bg-gray-50 border-r border-gray-100 flex flex-col overflow-auto">
                        <div className="p-4">
                            <button
                                onClick={() => { setIsMobileSidebarOpen(false); setMessages([]); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-[#0F2A3D] hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                            >
                                <Icons.Plus />
                                <span>New Chat</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2">Recent</div>
                            {conversations.map(item => (
                                <button
                                    key={item._id}
                                    onClick={() => { setIsMobileSidebarOpen(false); switchConversation(item._id); }}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all group relative border ${activeConversationId === item._id
                                        ? 'bg-white border-gray-200 shadow-sm'
                                        : 'hover:bg-white border-transparent hover:border-gray-100'
                                        }`}
                                >
                                    <div className="text-sm font-bold text-[#0F2A3D] truncate pr-8 tracking-tight">{item.title}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                                        {new Date(item.updatedAt).toLocaleDateString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-8 h-8 bg-[#17A2B8] rounded-lg flex items-center justify-center text-white text-xs font-black uppercase">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-[#0F2A3D] truncate">{user.name}</div>
                                    <div className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase">{user.role} Access</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Content */}
            <div className="flex-1 flex flex-col bg-white relative">
                {/* Mobile open button */}
                {isMobile && (
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden absolute left-4 top-4 z-20 p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-gray-400 hover:text-[#17A2B8]"
                    >
                        <Icons.Layout />
                    </button>
                )}

                {/* Desktop collapse/expand */}
                {!isMobile && !isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="hidden md:inline absolute left-4 top-4 z-20 p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-gray-400 hover:text-[#17A2B8]"
                    >
                        <Icons.Layout />
                    </button>
                )}

                {!isMobile && isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="hidden md:inline absolute left-4 top-4 z-20 p-2 text-gray-400 hover:text-[#17A2B8] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13l-6-6-6 6" /></svg>
                    </button>
                )}

                {/* Header (Minimal) */}
                <div className="h-16 flex items-center justify-center border-b border-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="text-[#17A2B8]"><Icons.Shield /></div>
                        <span className="text-sm font-black text-[#0F2A3D] uppercase tracking-tighter">Ask to <span className="text-[#17A2B8]">help</span></span>
                    </div>
                </div>

                {/* Message Container */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-[#17A2B8] border border-gray-100 shadow-inner">
                                    <div className="scale-150"><Icons.Shield /></div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#0F2A3D] uppercase tracking-tighter">Unified Security Node</h3>
                                    <p className="text-gray-400 text-sm font-bold mt-2 uppercase tracking-widest leading-loose max-w-sm">
                                        Query ASTU safety policies, emergency protocols, or report an incident securely.
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex gap-4 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[60%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-[#0F2A3D] text-white' : 'bg-[#17A2B8] text-white'
                                        }`}>
                                        {msg.role === 'user' ? <Icons.Layout /> : <Icons.Shield />}
                                    </div>
                                    <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm border ${msg.role === 'user'
                                        ? 'bg-white border-gray-100 text-[#0F2A3D] font-medium'
                                        : 'bg-[#F4F8FA] border-transparent text-gray-800'
                                        }`}>
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                        <div className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Icons.Lock />
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#17A2B8] text-white flex items-center justify-center">
                                        <Icons.Shield />
                                    </div>
                                    <div className="bg-gray-50 border border-transparent p-5 rounded-2xl shadow-sm flex gap-1.5 items-center">
                                        <div className="w-1.5 h-1.5 bg-[#17A2B8] rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-[#17A2B8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-[#17A2B8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input area */}
                <div className="p-6 border-t border-gray-50 flex-shrink-0">
                    <div className="max-w-3xl mx-auto relative group">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Query security node or report an issue..."
                            rows={1}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#17A2B8] focus:bg-white rounded-2xl px-6 py-5 pr-20 text-sm font-bold text-[#0F2A3D] outline-none transition-all shadow-inner resize-none overflow-hidden min-h-[64px]"
                            style={{ height: 'auto' }}
                        />
                        <div className="absolute right-3 bottom-3 flex items-center gap-2">
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="bg-[#0F2A3D] text-white p-3 rounded-xl hover:bg-[#17A2B8] transition-all active:scale-95 shadow-lg disabled:opacity-20 disabled:scale-100 disabled:bg-gray-400"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polyline points="22 2 15 22 11 13 2 9 22 2" /></svg>
                            </button>
                        </div>
                    </div>
                    <p className="text-center mt-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">
                        Institutional Intelligence Node • Addis Science & Technology University
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
