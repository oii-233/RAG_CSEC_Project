
import { Response } from 'express';
import DocumentModel, { IDocument } from '../models/Document';
import Chat from '../models/Chat';
import Conversation from '../models/Conversation';
import { IAuthRequest } from '../types';
import { chunkText, cleanText, extractTextFromFile } from '../utils/textProcessing';
import { ragService } from '../services/ragService';

/**
 * @desc    Ask chatbot a question (RAG implementation with vector search)
 * @route   POST /api/chat/ask
 * @access  Private
 */
export const askQuestion = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { question, conversationId: reqConversationId } = req.body;

        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        if (!question || question.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Please provide a question'
            });
            return;
        }

        console.log(`💬 Processing question from ${req.user.email}: "${question}"`);

        // Use RAG Service to process the question
        const { answer, relevantDocs } = await ragService.processQuestion(question);
        
        // Handle Conversation
        let conversationId = reqConversationId;
        let conversation;

        if (conversationId) {
            conversation = await Conversation.findOne({ _id: conversationId, user: req.user.id });
            if (conversation) {
                conversation.lastMessage = answer.substring(0, 100);
                await conversation.save();
            }
        }

        if (!conversation) {
            // Create new conversation
            const title = question.length > 50 ? question.substring(0, 47) + '...' : question;
            conversation = await Conversation.create({
                user: req.user.id,
                title,
                lastMessage: answer.substring(0, 100)
            });
            conversationId = conversation._id;
        }

        // Save to Chat History
        try {
            await Chat.create({
                user: req.user.id,
                conversation: conversationId,
                role: 'user',
                text: question
            });

            await Chat.create({
                user: req.user.id,
                conversation: conversationId,
                role: 'model',
                text: answer
            });
        } catch (dbError) {
            console.error('❌ Error saving chat history:', dbError);
        }

        // Return Response
        res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                conversationId,
                sources: relevantDocs.map(doc => ({
                    id: doc._id,
                    title: doc.title,
                    category: doc.category,
                    similarity: doc.similarity,
                    isChunk: doc.isChunk,
                    chunkIndex: doc.chunkIndex
                })),
                timestamp: new Date()
            }
        });

    } catch (error) {
        const err = error as Error;
        console.error('❌ Chat error:', err);
        res.status(500).json({
            success: false,
            message: 'Error processing your question',
            error: err.message
        });
    }
};

/**
 * @desc    Upload document for RAG system (with automatic chunking)
 * @route   POST /api/chat/upload/text
 * @access  Private (Admin only)
 */
/**
 * Helper to process and save documents to the database (handles chunking and embeddings)
 */
const processAndSaveDocument = async (
    title: string,
    content: string,
    userId: string,
    category: string = 'other',
    tags: string[] = []
) => {
    // Clean content
    const cleanedContent = cleanText(content);

    // Determine if chunking is needed (>2000 characters)
    const needsChunking = cleanedContent.length > 2000;

    if (needsChunking) {
        console.log(`📑 Document is large (${cleanedContent.length} chars), chunking...`);

        // Create chunks
        const chunks = chunkText(cleanedContent, 1000, 200);
        console.log(`   Created ${chunks.length} chunks`);

        // Create parent document (without embedding, just metadata)
        const parentDoc = await DocumentModel.create({
            title,
            content: cleanedContent,
            category: category || 'other',
            tags: tags || [],
            embedding: [], // Parent doesn't have embedding
            uploadedBy: userId,
            isPublic: true,
            isChunk: false,
            chunkCount: chunks.length
        });

        console.log('✅ Parent document created:', parentDoc._id);

        // Create chunk documents with embeddings
        const chunkPromises = chunks.map(async (chunk, index) => {
            const embedding = await ragService.generateEmbedding(chunk.text);

            return DocumentModel.create({
                title: `${title} (Chunk ${index + 1}/${chunks.length})`,
                content: chunk.text,
                category: category || 'other',
                tags: tags || [],
                embedding: embedding || [],
                uploadedBy: userId,
                isPublic: true,
                isChunk: true,
                parentDocumentId: parentDoc._id,
                chunkIndex: chunk.index,
                chunkCount: chunks.length
            });
        });

        await Promise.all(chunkPromises);

        console.log(`✅ All ${chunks.length} chunks created with embeddings`);

        return {
            id: parentDoc._id,
            title: parentDoc.title,
            category: parentDoc.category,
            chunksCreated: chunks.length,
            createdAt: parentDoc.createdAt
        };
    } else {
        console.log('📄 Document is small, creating single document with embedding...');

        // Generate embedding for the document
        const embedding = await ragService.generateEmbedding(cleanedContent);

        // Create single document
        const document = await DocumentModel.create({
            title,
            content: cleanedContent,
            category: category || 'other',
            tags: tags || [],
            embedding: embedding || [],
            uploadedBy: userId,
            isPublic: true,
            isChunk: false
        });

        console.log('✅ Document uploaded successfully:', document.title);

        return {
            id: document._id,
            title: document.title,
            category: document.category,
            createdAt: document.createdAt
        };
    }
};

/**
 * @desc    Upload document for RAG system (manual text input)
 * @route   POST /api/chat/upload/text
 * @access  Private (Admin only)
 */
export const uploadDocument = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { title, content, category, tags } = req.body;

        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        console.log('📄 Document upload from user:', req.user.email);

        // Validate input
        if (!title || !content) {
            res.status(400).json({
                success: false,
                message: 'Please provide title and content'
            });
            return;
        }

        const result = await processAndSaveDocument(title, content, req.user.id, category, tags);

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: { document: result }
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Document upload error:', err);
        res.status(500).json({
            success: false,
            message: 'Error uploading document',
            error: err.message
        });
    }
};

/**
 * @desc    Upload file for RAG system (PDF/TXT)
 * @route   POST /api/chat/upload/file
 * @access  Private (Admin only)
 */
export const uploadFile = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { category, tags } = req.body;
        const file = req.file;

        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        if (!file) {
            res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
            return;
        }

        console.log('📁 File upload from user:', req.user.email);
        console.log(`   File name: ${file.originalname}, size: ${file.size} bytes, mimetype: ${file.mimetype}`);

        if (!file.buffer || file.buffer.length === 0) {
            console.error('❌ File buffer is empty!');
        }

        // Extract text from file
        const content = await extractTextFromFile(file.buffer, file.mimetype || file.originalname);

        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Could not extract text from the uploaded file'
            });
            return;
        }

        // Use original filename as title if not provided
        const title = req.body.title || file.originalname;

        const result = await processAndSaveDocument(title, content, req.user.id, category, tags);

        res.status(201).json({
            success: true,
            message: 'File uploaded and processed successfully',
            data: { document: result }
        });
    } catch (error: any) {
        console.error('❌ File upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing uploaded file',
            error: error.message
        });
    }
};

/**
 * @desc    Get all documents
 * @route   GET /api/chat/documents
 * @access  Private
 */
export const getDocuments = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { category, search, limit = '20', page = '1', includeChunks = 'false' } = req.query;

        console.log('📚 Fetching documents...');

        // Build query - exclude chunks by default
        const query: any = {
            isPublic: true,
            isChunk: includeChunks === 'true' ? undefined : false
        };

        if (category) query.category = category;
        if (search) {
            query.$text = { $search: search as string };
        }

        // Parse pagination params
        const limitNum = parseInt(limit as string);
        const pageNum = parseInt(page as string);

        // Execute query with pagination
        const documents = await DocumentModel.find(query)
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum);

        const total = await DocumentModel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                documents,
                pagination: {
                    total,
                    page: pageNum,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Get documents error:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching documents',
            error: err.message
        });
    }
};

/**
 * @desc    Delete document and its chunks
 * @route   DELETE /api/chat/documents/:id
 * @access  Private (Admin only)
 */
export const deleteDocument = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        console.log('🗑️  Deleting document:', id);

        // Find the document
        const document = await DocumentModel.findById(id);

        if (!document) {
            res.status(404).json({
                success: false,
                message: 'Document not found'
            });
            return;
        }

        // If it's a parent document, delete all chunks
        if (!document.isChunk && document.chunkCount && document.chunkCount > 0) {
            const deleteResult = await DocumentModel.deleteMany({ parentDocumentId: id });
            console.log(`   Deleted ${deleteResult.deletedCount} chunks`);
        }

        await document.deleteOne();

        console.log('✅ Document deleted successfully');

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Delete document error:', err);
        res.status(500).json({
            success: false,
            message: 'Error deleting document',
            error: err.message
        });
    }
};
/**
 * @desc    Get chat history for current user
 * @route   GET /api/chat/history
 * @access  Private
 */
export const getChatHistory = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        console.log('📜 Fetching chat history for user:', req.user.email);

        const history = await Chat.find({ user: req.user.id })
            .sort({ timestamp: 1 })
            .limit(50); // Limit to last 50 messages for performance

        res.status(200).json({
            success: true,
            data: {
                messages: history.map(msg => ({
                    role: msg.role,
                    text: msg.text,
                    timestamp: msg.timestamp
                }))
            }
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Get history error:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching chat history',
            error: err.message
        });
    }
};

/**
 * @desc    Get all conversations for current user
 * @route   GET /api/chat/conversations
 * @access  Private
 */
export const getConversations = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const conversations = await Conversation.find({ user: req.user.id })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            data: { conversations }
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Get conversations error:', err);
        res.status(500).json({ success: false, message: 'Failed to access ዘብ AI', error: err.message });
    }
};

/**
 * @desc    Get messages for a specific conversation
 * @route   GET /api/chat/conversations/:id/messages
 * @access  Private
 */
export const getConversationMessages = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { id } = req.params;

        // Verify conversation belongs to user
        const conversation = await Conversation.findOne({ _id: id, user: req.user.id });
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }

        const messages = await Chat.find({ conversation: id })
            .sort({ timestamp: 1 });

        res.status(200).json({
            success: true,
            data: {
                messages: messages.map(msg => ({
                    role: msg.role,
                    text: msg.text,
                    timestamp: msg.timestamp
                }))
            }
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Get conversation messages error:', err);
        res.status(500).json({ success: false, message: 'Error fetching messages', error: err.message });
    }
};

/**
 * @desc    Delete a conversation and its messages
 * @route   DELETE /api/chat/conversations/:id
 * @access  Private
 */
export const deleteConversation = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { id } = req.params;

        const conversation = await Conversation.findOne({ _id: id, user: req.user.id });
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
            return;
        }

        // Delete all messages in the conversation
        await Chat.deleteMany({ conversation: id });

        // Delete the conversation itself
        await conversation.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Conversation and messages deleted successfully'
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Delete conversation error:', err);
        res.status(500).json({ success: false, message: 'Error deleting conversation', error: err.message });
    }
};
