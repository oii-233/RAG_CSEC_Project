import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import connectDB from './config/db';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';

// Initialize Express app
console.log('🏁 Server.ts Initializing...');
const app: Application = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL
    ].filter(Boolean) as string[],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
        console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
    });
}

// ============================================
// ROUTES
// ============================================

// Health check route
app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'ASTU Smart Campus Safety API - Server is running',
        timestamp: new Date(),
        version: '1.0.0'
    });
});

// API status route
app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
        success: true,
        status: 'operational',
        database: 'connected',
        timestamp: new Date()
    });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - Route not found
app.use((req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Error:', err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e: any) => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
        return res.status(400).json({
            success: false,
            message: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Default error
    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// SERVER INITIALIZATION
// ============================================

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start listening
        const server = app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log('🚀 ASTU Smart Campus Safety Backend');
            console.log('='.repeat(50));
            // @ts-ignore
            const actualPort = server.address()?.port || PORT;
            console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${actualPort}`);
            console.log(`🌐 Server URL: http://localhost:${actualPort}`);
            console.log(`📡 API Base: http://localhost:${actualPort}/api`);
        });

        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                console.log(`⚠️ Port ${PORT} in use, trying ${Number(PORT) + 1}...`);
                app.listen(Number(PORT) + 1, () => {
                   console.log(`🚀 Server running on fallback port ${Number(PORT) + 1}`);
                });
            } else {
                console.error('❌ Server startup error:', e);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
