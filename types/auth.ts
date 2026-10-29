// types/auth.ts

export interface User {
    id: number | string;
    name: string;
    email?: string | null;
    phone?: string | null;
    phone_number?: string | null;
    address?: string | null;
    avatar?: string | null;
    email_verified_at?: string | null;
    phone_verified_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: any;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (credentials: any) => Promise<User>;
    register: (data: any) => Promise<User>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    applyUser: (nextUser: User | null) => void;
}
