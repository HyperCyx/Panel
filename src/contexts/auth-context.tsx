'use client';

import { useState, useEffect, createContext, ReactNode, useCallback } from 'react';
import type { UserProfile } from '@/lib/types';
import { getCurrentUser } from '@/app/actions';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    refreshUser: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    initialUser?: UserProfile | null;
}

export const AuthProvider = ({ children, initialUser }: AuthProviderProps) => {
    const [user, setUser] = useState<UserProfile | null>(initialUser ?? null);
    const [loading, setLoading] = useState(initialUser === undefined);

    const fetchUser = useCallback(async () => {
        setLoading(true);
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Skip initial fetch if we already have the user from the server
        if (initialUser !== undefined) return;
        fetchUser();
    }, [fetchUser, initialUser]);

    const value = { user, loading, refreshUser: fetchUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
