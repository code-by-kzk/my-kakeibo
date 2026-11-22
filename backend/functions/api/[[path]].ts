
interface Env {
    RENDER_API_ORIGIN: string;
}

interface PagesContext {
    request: Request;
    env: Env;
}

export async function onRequest(
    context: PagesContext,
): Promise<Response> {
    const { request, env } = context;

    // ========================================
    // Render APIの接続先
    // ========================================

    const configuredOrigin =
        env.RENDER_API_ORIGIN?.trim();

    if (!configuredOrigin) {
        return new Response(
            "API proxy is not configured",
            { status: 503 },
        );
    }

    let renderOrigin: URL;

    try {
        renderOrigin = new URL(configuredOrigin);

        if (
            renderOrigin.protocol !== "https:" ||
            renderOrigin.username ||
            renderOrigin.password ||
            renderOrigin.search ||
            renderOrigin.hash ||
            renderOrigin.pathname !== "/"
        ) {
            throw new Error("Invalid API origin");
        }
    } catch {
        return new Response(
            "Invalid API proxy configuration",
            { status: 503 },
        );
    }

    // ========================================
    // 転送先URL
    // ========================================

    const incomingUrl = new URL(request.url);

    const targetUrl = new URL(
        incomingUrl.pathname + incomingUrl.search,
        renderOrigin,
    );

    // ========================================
    // リクエストヘッダー
    // ========================================

    const headers = new Headers(request.headers);

    // 転送先のHostはfetchに設定させる
    headers.delete("host");

    // クライアントが指定した転送系ヘッダーを
    // Go API側の信頼情報として扱わない
    headers.delete("x-forwarded-for");
    headers.delete("x-forwarded-host");
    headers.delete("x-forwarded-proto");
    headers.delete("forwarded");
    headers.delete("cf-connecting-ip");
    headers.delete("true-client-ip");

    // ========================================
    // Renderへ転送
    // ========================================

    try {
        const upstreamRequest = new Request(
            targetUrl.toString(),
            {
                method: request.method,
                headers,
                body:
                    request.method === "GET" ||
                        request.method === "HEAD"
                        ? undefined
                        : request.body,
                redirect: "manual",
                signal: request.signal,
                // Cloudflare Workersでストリームを
                // 転送するための設定
                ...(request.body &&
                    request.method !== "GET" &&
                    request.method !== "HEAD"
                    ? { duplex: "half" as const }
                    : {}),
            } as RequestInit,
        );

        const upstreamResponse =
            await fetch(upstreamRequest);

        // ========================================
        // レスポンスをブラウザへ返す
        // ========================================

        const responseHeaders = new Headers(
            upstreamResponse.headers,
        );

        // Render内部のリダイレクト先を
        // ブラウザへ露出させない
        if (
            upstreamResponse.status >= 300 &&
            upstreamResponse.status < 400
        ) {
            return new Response(
                "Upstream redirect is not allowed",
                { status: 502 },
            );
        }

        return new Response(
            upstreamResponse.body,
            {
                status: upstreamResponse.status,
                headers: responseHeaders,
            },
        );
    } catch {
        return new Response(
            "API server is temporarily unavailable",
            { status: 502 },
        );
    }
}
