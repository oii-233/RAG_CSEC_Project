
import { UserRole, User } from '../types';

const API_URL = 'http://localhost:5000/api';

export interface AuthResponse {
    success: boolean;
    message?: string;
    data?: {
        user: {
            id: string;
            name: string;
            email: string;
            universityId: string;
            role: 'student' | 'admin' | 'staff';
            createdAt: string;
        };
        token: string;
    };
    errors?: any[];
}

const mapBackendRoleToFrontend = (role: string): UserRole => {
    switch (role.toLowerCase()) {
        case 'admin':
            return UserRole.ADMIN;
        case 'student':
        case 'staff':
        default:
            return UserRole.STUDENT;
    }
};

export const authService = {
    async signup(data: any): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, message: 'Failed to connect to authentication server' };
        }
    },

    async login(credentials: any): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Failed to connect to authentication server' };
        }
    },

    async getCurrentUser(token: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, message: 'Failed to fetch user data' };
        }
    },

    formatUser(backendUser: any): User {
        return {
            id: backendUser.id,
            email: backendUser.email,
            name: backendUser.name,
            role: mapBackendRoleToFrontend(backendUser.role),
            universityId: backendUser.universityId,
        };
    }
};
