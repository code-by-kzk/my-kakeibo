
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type AuthContextType = {
    isAuthenticated: boolean;
    isLoading: boolean;
    refreshAuth: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refreshAuth = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                credentials: "include",
            });

            setIsAuthenticated(response.ok);
        } catch {
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshAuth();
    }, [refreshAuth]);

    const logout = useCallback(async () => {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("ログアウトに失敗しました");
        }

        setIsAuthenticated(false);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
                refreshAuth,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }

    return context;
}
