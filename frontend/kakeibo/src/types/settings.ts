
export type HouseholdSettings = {
    householdName: string;
    memberNames: {
        A: string;
        B: string;
    };
    defaultSharePercentA: number;
};

export const defaultSettings: HouseholdSettings = {
    householdName: "ふたりの家計簿",
    memberNames: {
        A: "Aさん",
        B: "Bさん",
    },
    defaultSharePercentA: 50,
};
