import { Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DocumentModel, { IDocument } from '../models/Document';
import Chat from '../models/Chat';
import Conversation from '../models/Conversation';
import { IAuthRequest } from '../types';
import { chunkText, cleanText, extractTextFromFile, truncateText } from '../utils/textProcessing';

/**
 * Voyage AI API response structure
 */
interface VoyageEmbeddingResponse {
    data: Array<{
        embedding: number[];
    }>;
}

/**
 * Initialize Google Gemini AI with 2.0 Flash
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model names
const VOYAGE_MODEL = 'voyage-3-large'; // 1024 dimensions
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Generate text embeddings using Voyage AI voyage-3-large model
 * @param {string} text - Text to embed
 * @returns {Promise<number[] | null>} Embedding vector (1024 dimensions)
 */
const generateEmbedding = async (text: string): Promise<number[] | null> => {
    try {
        console.log(`🔢 Generating embedding with ${VOYAGE_MODEL}...`);
        console.log('   Text preview:', truncateText(text, 80));

        const response: AxiosResponse<VoyageEmbeddingResponse> = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            {
                input: text,
                model: VOYAGE_MODEL
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.data && response.data.data[0]) {
            const embedding = response.data.data[0].embedding;
            console.log(`✅ Embedding generated successfully (${embedding.length} dimensions)`);
            return embedding;
        }

        throw new Error('Invalid response from Voyage AI');
    } catch (error) {
        const err = error as any;
        console.error('❌ Error generating embedding:', err.message);

        if (err.response) {
            console.error('Voyage AI API error:', err.response.data);
        }
        return null;
    }
};

/**
 * Find relevant documents using vector similarity search
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} limit - Max documents to return
 * @returns {Promise<Array<IDocument & { similarity: number }>>} Relevant documents with similarity scores
 */
const findRelevantDocumentsByEmbedding = async (
    queryEmbedding: number[],
    limit: number = 3
): Promise<Array<IDocument & { similarity: number }>> => {
    try {
        console.log('🔍 Searching relevant documents using Atlas Vector Search...');

        // Use native Atlas Vector Search method
        const results = await DocumentModel.vectorSearch(queryEmbedding, limit);

        console.log(`✅ Found ${results.length} relevant documents via Atlas`);
        results.forEach((doc, idx) => {
            console.log(`   ${idx + 1}. "${doc.title}" (score: ${doc.similarity.toFixed(3)})`);
        });

        return results;
    } catch (error) {
        console.error('❌ Error in findRelevantDocumentsByEmbedding:', error);
        return [];
    }
};

/**
 * Find relevant documents for RAG (fallback to text search if no embedding provided)
 * @param {string} query - User query
 * @param {number} limit - Max documents to return
 * @returns {Promise<IDocument[]>} Relevant documents
 */
const findRelevantDocuments = async (query: string, limit: number = 3): Promise<IDocument[]> => {
    try {
        console.log('🔍 Searching for relevant documents (text search fallback)...');

        // Try to use text search
        const documents = await DocumentModel.findSimilar(query, limit);

        if (documents && documents.length > 0) {
            console.log(`✅ Found ${documents.length} relevant documents`);
            return documents;
        }

        console.log('ℹ️  No relevant documents found');
        return [];
    } catch (error) {
        console.error('❌ Error finding relevant documents:', error);
        return [];
    }
};

/**
 * Generate AI response using Google Gemini 2.0 Flash
 * @param {string} question - User question
 * @param {Array} context - Relevant documents for context
 * @returns {Promise<string>} AI response
 */
const generateAIResponse = async (
    question: string,
    context: Array<IDocument & { similarity?: number }> = []
): Promise<string> => {
    try {
        console.log(`🤖 Generating AI response with ${GEMINI_MODEL}...`);

        // Initialize Gemini client LOCALLY to ensure env vars are loaded
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing from environment variables');
        }
        
        // Use system instruction separately for better adherence
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            systemInstruction: {
                parts: [{ text: `You are ዘብ AI, the intelligent safety assistant for the ASTU (Addis Science and Technology University) Smart Campus Safety Platform. 

Your goals:
1. Provide clear, accurate safety information based ONLY on the provided context.
2. Guide students to correct resources: security contacts, health services, or incident reporting forms.
3. If an immediate threat is described, prioritize emergency contact instructions.
4. Maintain a professional, supportive, and concise tone.
5. If the context doesn't have the answer, gracefully direct the user to campus security.` }]
            }
        });

        // Build context from documents
        let contextText = '';
        if (context.length > 0) {
            contextText = '\n\nRelevant Information from Campus Safety Documents:\n';
            context.forEach((doc, index) => {
                const similarityInfo = doc.similarity
                    ? ` (Relevance: ${(doc.similarity * 100).toFixed(1)}%)`
                    : '';
                const contentPreview = truncateText(doc.content, 500);
                contextText += `\n${index + 1}. ${doc.title}${similarityInfo}\n${contentPreview}\n`;
            });
        }

        // Combine components into a structured prompt
        const promptParts = [
            { text: contextText ? `\n\nCONTEXT:\n${contextText}` : "" },
            { text: `\n\nSTUDENT QUESTION: ${question}` }
        ];

        // Generate response using modern API pattern
        console.log(`📡 Sending request to Gemini 2.5 Flash...`);
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: promptParts }],
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7,
            }
        });

        const response = await result.response;
        const text = response.text();

        console.log('✅ AI response generated successfully using Gemini 2.5 Flash');
        return text;
    } catch (error) {
        const err = error as any;
        console.error('❌ ERROR in generateAIResponse:');
        console.error('   Message:', err.message);

        // Fallback response with DEBUG info
        return `(DEBUG MODE) Error generating response: ${err.message}. Please check backend logs for details.`;
    }
};

/**
 * @desc    Ask chatbot a question (RAG implementation with vector search)
 * @route   POST /api/chat/ask
 * @access  Private
 */
export const askQuestion = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { question } = req.body;

        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        console.log('💬 Chat request from user:', req.user.email);
        console.log('Question:', question);

        // Validate question
        if (!question || question.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Please provide a question'
            });
            return;
        }

        if (question.length > 1000) {
            res.status(400).json({
                success: false,
                message: 'Question is too long (max 1000 characters)'
            });
            return;
        }

        // Step 1: Generate embedding for the question
        const queryEmbedding = await generateEmbedding(question);

        let relevantDocs: Array<IDocument & { similarity?: number }> = [];

        // Step 2: Find relevant documents using embedding or fallback to text search
        if (queryEmbedding && queryEmbedding.length > 0) {
            relevantDocs = await findRelevantDocumentsByEmbedding(queryEmbedding, 3);
        } else {
            console.log('⚠️  Falling back to text search (no embedding available)');
            relevantDocs = await findRelevantDocuments(question, 3);
        }

        // Step 3: Generate AI response with context (RAG generation)
        const aiResponse = await generateAIResponse(question, relevantDocs);

        // Step 4: Handle Conversation
        let { conversationId } = req.body;
        let conversation;

        if (conversationId) {
            conversation = await Conversation.findOne({ _id: conversationId, user: req.user.id });
            if (conversation) {
                conversation.lastMessage = aiResponse.substring(0, 100);
                await conversation.save();
            }
        }

        if (!conversation) {
            // Create new conversation if none provided or not found
            // Use the question as title (truncated)
            const title = question.length > 50 ? question.substring(0, 47) + '...' : question;
            conversation = await Conversation.create({
                user: req.user.id,
                title,
                lastMessage: aiResponse.substring(0, 100)
            });
            conversationId = conversation._id;
        }

        // Step 5: Save chat history to database
        try {
            // Save user message
            await Chat.create({
                user: req.user.id,
                conversation: conversationId,
                role: 'user',
                text: question
            });

            // Save assistant response
            await Chat.create({
                user: req.user.id,
                conversation: conversationId,
                role: 'model',
                text: aiResponse
            });
            console.log('💾 Chat history saved for user:', req.user.email);
        } catch (dbError) {
            console.error('❌ Error saving chat history:', dbError);
            // Don't fail the request if saving history fails
        }

        // Step 6: Return response
        res.status(200).json({
            success: true,
            data: {
                question,
                answer: aiResponse,
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

        console.log('✅ Chat response sent successfully');
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
            const embedding = await generateEmbedding(chunk.text);

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
        const embedding = await generateEmbedding(cleanedContent);

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
