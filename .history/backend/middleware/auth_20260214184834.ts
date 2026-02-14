import { Response, NextFunction } from 'express';
console.log('🚀 Auth Middleware Loaded');
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { IAuthRequest, IUserPayload } from '../types';

/**
 * Protect routes - Verify JWT token
 * Middleware to authenticate users and attach user to request
 */
export const protect = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    let token: string | undefined;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
        // console.log('🔐 Token received');
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IUserPayload;

        // Verify user exists in DB
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
             res.status(401).json({ success: false, message: 'Not authorized, user not found' });
             return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('❌ Not authorized, token failed:', error);
        res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};

/**
 * Authorize user roles
 * Middleware to check if user has required role
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles: string[]) => {
    return (req: IAuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            console.log(`❌ User ${req.user.email} with role ${req.user.role} not authorized`);
            res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
            return;
        }

        console.log(`✅ User ${req.user.email} authorized with role ${req.user.role}`);
        next();
    };
};
