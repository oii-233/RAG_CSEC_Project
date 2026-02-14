
const API_URL = 'http://localhost:5001/api';

export interface ChatResponse {
    success: boolean;
    message?: string;
    data?: {
        question: string;
        answer: string;
        conversationId: string;
        sources: any[];
        timestamp: string;
    };
    error?: string;
}

export interface Conversation {
    _id: string;
    title: string;
    lastMessage?: string;
    updatedAt: string;
}

export interface ConversationListResponse {
    success: boolean;
    data?: {
        conversations: Conversation[];
    };
    error?: string;
}

export interface DocumentResponse {
    success: boolean;
    message?: string;
    data?: {
        documents: any[];
        pagination: {
            total: number;
            page: number;
            pages: number;
        };
    };
    error?: string;
}

export interface ChatHistoryResponse {
    success: boolean;
    message?: string;
    data?: {
        messages: {
            role: 'user' | 'model';
            text: string;
            timestamp: string;
        }[];
    };
    error?: string;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

export const chatService = {
    async askQuestion(question: string, conversationId?: string | null): Promise<ChatResponse> {
        try {
            const response = await fetch(`${API_URL}/chat/ask`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ question, conversationId }),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Chat API error:', error);
            return { success: false, message: 'Failed to connect to ዘብ AI' };
        }
    },

    async getChatHistory(): Promise<ChatHistoryResponse> {
        try {
            const response = await fetch(`${API_URL}/chat/history`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Fetch history error:', error);
            return { success: false, message: 'Failed to fetch chat history' };
        }
    },

    async getConversations(): Promise<ConversationListResponse> {
        try {
            const response = await fetch(`${API_URL}/chat/conversations`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Fetch conversations error:', error);
            return { success: false, error: 'Failed' } as any;
        }
    },

    async getMessagesByConversation(id: string): Promise<ChatHistoryResponse> {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${id}/messages`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Fetch conversation messages error:', error);
            return { success: false, message: 'Failed to fetch messages' };
        }
    },

    async deleteConversation(id: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            return await response.json();
        } catch (error) {
            console.error('Delete conversation error:', error);
            return { success: false, message: 'Failed to delete conversation' };
        }
    },

    async getDocuments(page = 1, limit = 20): Promise<DocumentResponse> {
        try {
            const response = await fetch(`${API_URL}/chat/documents?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Fetch documents error:', error);
            return { success: false, message: 'Failed to fetch knowledge base documents' };
        }
    },

    async uploadText(title: string, content: string, category = 'other', tags: string[] = []): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/chat/upload/text`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ title, content, category, tags }),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Upload text error:', error);
            return { success: false, message: 'Failed to upload document content' };
        }
    },

    async uploadFile(file: File, category = 'other', tags: string[] = []): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            tags.forEach(tag => formData.append('tags', tag));

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/chat/upload/file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Upload file error:', error);
            return { success: false, message: 'Failed to upload document file' };
        }
    },

    async deleteDocument(id: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/chat/documents/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Delete document error:', error);
            return { success: false, message: 'Failed to delete document' };
        }
    }
};
