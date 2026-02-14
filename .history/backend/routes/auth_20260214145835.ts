import express, { Router } from 'express';
import { body } from 'express-validator';
import {
    signup,
    login,
    getCurrentUser,
    updateProfile,
    getUsers,
    banUser
} from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post(
    '/signup',
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),
        body('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('universityId')
            .trim()
            .notEmpty()
            .withMessage('University ID is required')
            .matches(/^ugr\/\d{5}\/\d{2}$/i)
            .withMessage('Please provide a valid university ID (format: ugr/XXXXX/XX)'),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('role')
            .optional()
            .isIn(['student', 'admin', 'staff'])
            .withMessage('Role must be student, admin, or staff')
    ],
    signup
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],
    login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, getCurrentUser);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
    '/profile',
    protect,
    [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),
        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail()
    ],
    updateProfile
);

export default router;
