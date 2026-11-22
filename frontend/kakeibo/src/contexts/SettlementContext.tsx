
import {
    fetchSettlements,
    createSettlement,
    deleteSettlement as deleteSettlementApi,
} from "../api/settlements";

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
    isLoading: boolean;
    loadError: string | null;
    addSettlement: (input: SettlementInput) => Promise<Settlement>;
    deleteSettlement: (id: string) => Promise<void>;
};

const SettlementContext =
    createContext<SettlementContextType | null>(null);

export function SettlementProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setIsLoading(true);
            setLoadError(null);

            try {
                const data = await fetchSettlements(controller.signal);

                if (!controller.signal.aborted) {
                    setSettlements(data);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error(
                        "精算履歴の取得に失敗しました",
                        error,
                    );

                    setLoadError("精算履歴を取得できませんでした");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void load();

        return () => controller.abort();
    }, []);

    const addSettlement = async (
        input: SettlementInput,
    ): Promise<Settlement> => {
        if (
            input.from === input.to ||
            !Number.isSafeInteger(input.amount) ||
            input.amount <= 0 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
        ) {
            throw new Error("精算内容が正しくありません");
        }

        const settlement = await createSettlement(input);

        setSettlements((prev) => [...prev, settlement]);

        return settlement;
    };

    const deleteSettlement = async (id: string): Promise<void> => {
        await deleteSettlementApi(id);

        setSettlements((prev) =>
            prev.filter((settlement) => settlement.id !== id),
        );
    };

    return (
        <SettlementContext.Provider
            value={{
                settlements,
                isLoading,
                loadError,
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