import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    Settlement,
    SettlementInput,
} from "../types/settlement";

type SettlementContextType = {
    settlements: Settlement[];
    addSettlement: (input: SettlementInput) => Settlement;
    deleteSettlement: (id: string) => void;
};

const STORAGE_KEY = "futari-kakeibo-settlements";

const SettlementContext =
    createContext<SettlementContextType | null>(null);

function loadSettlements(): Settlement[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) return [];

        const parsed: unknown = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            throw new Error("Invalid settlement data");
        }

        return parsed.filter((item): item is Settlement => {
            if (typeof item !== "object" || item === null) {
                return false;
            }

            const value = item as Partial<Settlement>;

            return (
                typeof value.id === "string" &&
                typeof value.date === "string" &&
                (value.from === "A" || value.from === "B") &&
                (value.to === "A" || value.to === "B") &&
                value.from !== value.to &&
                typeof value.amount === "number" &&
                Number.isSafeInteger(value.amount) &&
                value.amount > 0
            );
        });
    } catch (error) {
        console.error("精算履歴の読み込みに失敗しました", error);
        throw error;
    }
}

export function SettlementProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [settlements, setSettlements] =
        useState<Settlement[]>(loadSettlements);

    useEffect(() => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(settlements),
        );
    }, [settlements]);

    const addSettlement = (
        input: SettlementInput,
    ): Settlement => {
        if (
            input.from === input.to ||
            !Number.isSafeInteger(input.amount) ||
            input.amount <= 0 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
        ) {
            throw new Error("精算内容が正しくありません");
        }

        const settlement: Settlement = {
            ...input,
            id: crypto.randomUUID(),
        };

        setSettlements((prev) => [...prev, settlement]);

        return settlement;
    };

    const deleteSettlement = (id: string) => {
        setSettlements((prev) =>
            prev.filter((settlement) => settlement.id !== id),
        );
    };

    return (
        <SettlementContext.Provider
            value={{
                settlements,
                addSettlement,
                deleteSettlement,
            }}
        >
            {children}
        </SettlementContext.Provider>
    );
}

export function useSettlements() {
    const context = useContext(SettlementContext);

    if (!context) {
        throw new Error(
            "useSettlements must be used within SettlementProvider",
        );
    }

    return context;
}