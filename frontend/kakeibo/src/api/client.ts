
const API_BASE_URL = "/api";

// API共通のエラーチェック
async function checkResponse(response: Response): Promise<void> {
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
}

// GET
export async function apiGet<T>(
    path: string,
    signal?: AbortSignal
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        signal,
    });

    await checkResponse(response);

    return response.json() as Promise<T>;
}

// POST
export async function apiPost<TResponse, TRequest>(
    path: string,
    data: TRequest
): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    await checkResponse(response);

    return response.json() as Promise<TResponse>;
}

// PUT（JSONレスポンスあり）
export async function apiPut<TResponse, TRequest>(
    path: string,
    data: TRequest
): Promise<TResponse> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    await checkResponse(response);

    return response.json() as Promise<TResponse>;
}

// PUT（レスポンスボディなし）
export async function apiPutNoContent<TRequest>(
    path: string,
    data: TRequest
): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    await checkResponse(response);
}

// DELETE
export async function apiDelete(path: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "DELETE",
    });

    await checkResponse(response);
}
