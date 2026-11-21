
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

type SettingsContextValue = {
    settings: HouseholdSettings;
    updateSettings: (next: HouseholdSettings) => void;
    resetSettings: () => void;
};

const STORAGE_KEY = "futari-kakeibo-settings";

const SettingsContext =
    createContext<SettingsContextValue | null>(null);

function loadSettings(): HouseholdSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return defaultSettings;
        }

        const parsed: unknown = JSON.parse(stored);

        if (
            typeof parsed !== "object" ||
            parsed === null
        ) {
            return defaultSettings;
        }

        const value = parsed as Partial<HouseholdSettings>;

        const names = value.memberNames;

        return {
            householdName:
                typeof value.householdName === "string" &&
                    value.householdName.trim()
                    ? value.householdName
                    : defaultSettings.householdName,

            memberNames: {
                A:
                    typeof names?.A === "string" &&
                        names.A.trim()
                        ? names.A
                        : defaultSettings.memberNames.A,
                B:
                    typeof names?.B === "string" &&
                        names.B.trim()
                        ? names.B
                        : defaultSettings.memberNames.B,
            },

            defaultSharePercentA:
                typeof value.defaultSharePercentA === "number" &&
                    Number.isFinite(value.defaultSharePercentA) &&
                    value.defaultSharePercentA >= 0 &&
                    value.defaultSharePercentA <= 100
                    ? value.defaultSharePercentA
                    : defaultSettings.defaultSharePercentA,
        };
    } catch {
        return defaultSettings;
    }
}

export function SettingsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [settings, setSettings] =
        useState<HouseholdSettings>(loadSettings);

    useEffect(() => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(settings)
        );
    }, [settings]);

    const updateSettings = (next: HouseholdSettings) => {
        setSettings(next);
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    return (
        <SettingsContext.Provider
            value={{
                settings,
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
