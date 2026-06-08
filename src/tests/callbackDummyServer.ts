import http from "http"

const PORT = Number(process.env.CALLBACK_TEST_PORT || 38473)

type RecordedHit = {
    method: string
    url: string
    headers: Record<string, string | string[] | undefined>
    timestamp: number
}

const hits: RecordedHit[] = []

const server = http.createServer((req, res) => {
    const url = req.url || "/"

    if (url === "/__test__/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/plain" })
        res.end("ok")
        return
    }

    if (url === "/__test__/hits" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(hits))
        return
    }

    if (url === "/__test__/reset" && req.method === "POST") {
        hits.length = 0
        res.writeHead(200, { "Content-Type": "text/plain" })
        res.end("ok")
        return
    }

    hits.push({
        method: req.method || "GET",
        url,
        headers: req.headers,
        timestamp: Date.now(),
    })
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("ok")
})

server.listen(PORT, "127.0.0.1", () => {
    console.log(`callback dummy server listening on http://127.0.0.1:${PORT}`)
})
