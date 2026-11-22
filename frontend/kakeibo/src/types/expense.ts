
export type Person = "A" | "B";

export type PaymentMethod =
    | "cash"
    | "credit"
    | "debit"
    | "qr";

// カテゴリはDBで管理するため、固定のUnion型を廃止
export type Category = string;

export type ExpenseCategory = {
    id: string;
    name: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type Expense = {
    id: string;
    date: string;
    amount: number;
    payer: Person;
    paymentMethod: PaymentMethod;
    category: Category;
    shares: {
        A: number;
        B: number;
    };
};

export type ExpenseInput = Omit<Expense, "id">;
