
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    defaultSettings,
    type HouseholdSettings,
} from "../types/settings";

import {
    apiGet,
    apiPutNoContent,
} from "../api/client";

type SettingsContextValue = {
    settings: HouseholdSettings;
    isLoading: boolean;
    loadError: string | null;
    updateSettings: (next: HouseholdSettings) => Promise<void>;
    resetSettings: () => Promise<void>;
};

const SettingsContext =
    createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [settings, setSettings] =
        useState<HouseholdSettings>(defaultSettings);

    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] =
        useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadSettings = async () => {
            try {
                setIsLoading(true);
                setLoadError(null);

                const data = await apiGet<HouseholdSettings>(
                    "/settings",
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setSettings(data);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setLoadError(
                        "設定情報の取得に失敗しました"
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        void loadSettings();

        return () => {
            controller.abort();
        };
    }, []);

    const updateSettings = async (
        next: HouseholdSettings
    ): Promise<void> => {
        await apiPutNoContent<HouseholdSettings>(
            "/settings",
            next
        );

        // API更新成功後に画面へ反映する
        setSettings(next);
        setLoadError(null);
    };

    const resetSettings = async (): Promise<void> => {
        await updateSettings(defaultSettings);
    };

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                loadError,
                updateSettings,
                resetSettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);

    if (!context) {
        throw new Error(
            "useSettings must be used within SettingsProvider"
        );
    }

    return context;
}
