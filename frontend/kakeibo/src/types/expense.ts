
export type Person = "A" | "B";

export type PaymentMethod =
    | "cash"
    | "credit"
    | "debit"
    | "qr";

export type Category =
    | "food"
    | "daily"
    | "transport"
    | "housing"
    | "utilities"
    | "entertainment"
    | "other";

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
