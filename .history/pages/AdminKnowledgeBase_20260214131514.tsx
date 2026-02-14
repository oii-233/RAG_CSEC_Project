
import React, { useState, useRef, useEffect } from 'react';
import { KnowledgeItem } from '../types';
import { Icons, COLORS } from '../constants';
import { chatService } from '../services/chatService';

const AdminKnowledgeBase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const result = await chatService.getDocuments();
    if (result.success && result.data) {
      const mappedDocs: KnowledgeItem[] = result.data.documents.map((doc: any) => ({
        id: doc._id,
        title: doc.title,
        category: doc.category.toUpperCase() as any,
        sourceType: doc.title.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC',
        lastUpdated: doc.updatedAt.split('T')[0],
        status: 'EMBEDDED'
      }));
      setKnowledge(mappedDocs);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      const result = await chatService.uploadFile(file, 'safety');
      if (result.success) {
        await fetchDocuments();
        alert("File uploaded successfully!");
      } else {
        alert(result.message || "Failed to upload document");
      }
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTextUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic || !content) {
          alert("Please provide both a title and content.");
          return;
      }
      
      setIsUploading(true);
      // Assume 'safety' as default category or let user choose if needed. 
      // Just using 'general' or 'safety' for now.
      const result = await chatService.uploadText(topic, content, 'safety');
      
      if (result.success) {
          await fetchDocuments();
          setTopic('');
          setContent('');
          alert("Text content uploaded successfully!");
      } else {
           alert(result.message || "Failed to upload text content");
      }
      setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this document?")) {
      const result = await chatService.deleteDocument(id);
      if (result.success) {
        setKnowledge(knowledge.filter(k => k.id !== id));
      } else {
        alert(result.message || "Failed to delete document");
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#0F2A3D]">Upload Center</h2>
          <p className="text-sm text-gray-500">Upload files or text to the knowledge base.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
        <div className="flex gap-4 mb-6 border-b border-gray-100 pb-4">
            <button 
                onClick={() => setActiveTab('file')}
                className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'file' ? 'text-[#17A2B8] border-b-2 border-[#17A2B8]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Upload File
            </button>
            <button 
                onClick={() => setActiveTab('text')}
                className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'text' ? 'text-[#17A2B8] border-b-2 border-[#17A2B8]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Upload Text
            </button>
        </div>

        {activeTab === 'file' ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                />
                <div className="w-16 h-16 bg-[#17A2B8]/10 text-[#17A2B8] rounded-full flex items-center justify-center mb-4">
                    <Icons.Plus />
                </div>
                <h3 className="text-[#0F2A3D] font-bold text-lg mb-2">Drag & Drop or Click to Upload</h3>
                <p className="text-gray-400 text-sm mb-6">Supported formats: PDF, DOCX, TXT</p>
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="bg-[#17A2B8] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-[#17A2B8]/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isUploading ? 'Uploading...' : 'Select Document'}
                </button>
            </div>
        ) : (
            <form onSubmit={handleTextUpload} className="space-y-4 max-w-2xl mx-auto">
                <div>
                    <label className="block text-sm font-bold text-[#0F2A3D] mb-2">Title / Topic</label>
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Campus Wi-Fi Policy"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 border focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8]/20 outline-none transition-all"
                        required 
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-[#0F2A3D] mb-2">Content</label>
                    <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste or type the policy content here..."
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 border focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8]/20 outline-none transition-all min-h-[200px]"
                        required
                    />
                </div>
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="bg-[#17A2B8] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-[#17A2B8]/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                         {isUploading ? (
                             <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing...</span>
                             </>
                         ) : (
                             <span>Upload Text Content</span>
                         )}
                    </button>
                </div>
            </form>
        )}
      </div>

      {/* Knowledge Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/10">
          <h3 className="font-bold text-[#0F2A3D] text-sm md:text-base uppercase tracking-tight">Uploaded Documents</h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{knowledge.length} Files</span>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {knowledge.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-[#0F2A3D] line-clamp-1">{item.title}</div>
                    <div className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.sourceType} • Updated {item.lastUpdated}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] md:text-[10px] font-black text-[#17A2B8] bg-[#17A2B8]/5 px-2 py-1 rounded border border-[#17A2B8]/10 uppercase tracking-wider">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'EMBEDDED' ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-yellow-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                        Syncing
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {knowledge.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-300 font-bold uppercase tracking-widest text-xs italic">
                    No documents indexed in knowledge base
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

export default AdminKnowledgeBase;
