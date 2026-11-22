
interface Env {
    RENDER_API_ORIGIN: string
    ASSETS: {
        fetch(request: Request): Promise<Response>
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)

        if (!url.pathname.startsWith('/api/')) {
            return env.ASSETS.fetch(request)
        }

        if (!env.RENDER_API_ORIGIN) {
            return new Response('API origin is not configured', {
                status: 500,
            })
        }

        const target = new URL(
            url.pathname + url.search,
            env.RENDER_API_ORIGIN
        )

        const headers = new Headers(request.headers)

        headers.delete('host')
        headers.delete('x-forwarded-for')
        headers.delete('x-forwarded-host')
        headers.delete('x-forwarded-proto')

        return fetch(target.toString(), {
            method: request.method,
            headers,
            body:
                request.method === 'GET' || request.method === 'HEAD'
                    ? undefined
                    : request.body,
            redirect: 'manual',
        })
    },
}
