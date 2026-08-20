export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // OPTIONS
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // GET or POST only
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({
            error: "Only GET and POST methods are allowed"
        });
    }

    try {
        let text;
        let source;
        let target;

        /*
         * GET
         *
         * /api/translate?text=Hello&source=en&target=hi
         */
        if (req.method === "GET") {
            text = req.query?.text;
            source = req.query?.source || "auto";
            target = req.query?.target;
        }

        /*
         * POST
         *
         * {
         *   "text": "Hello",
         *   "source": "en",
         *   "target": "hi"
         * }
         */
        if (req.method === "POST") {
            text = req.body?.text;
            source = req.body?.source || "auto";
            target = req.body?.target;
        }

        // Validation
        if (!text) {
            return res.status(400).json({
                error: "Missing text"
            });
        }

        if (!target) {
            return res.status(400).json({
                error: "Missing target language"
            });
        }

        /*
         * Google Translate mobile web page
         */
        const translateURL =
            "https://translate.google.com/m" +
            "?sl=" +
            encodeURIComponent(source) +
            "&tl=" +
            encodeURIComponent(target) +
            "&q=" +
            encodeURIComponent(text);

        const response = await fetch(translateURL, {
            method: "GET",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/151.0.0.0 Safari/537.36",

                "Accept":
                    "text/html,application/xhtml+xml"
            }
        });

        if (!response.ok) {
            return res.status(502).json({
                error:
                    "Google Translate returned HTTP " +
                    response.status
            });
        }

        const html = await response.text();

        let translated = null;

        /*
         * Extract result-container
         */
        const resultMatch = html.match(
            /<div[^>]*class=["'][^"']*result-container[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );

        if (resultMatch) {
            translated = resultMatch[1];
        }

        /*
         * Fallback
         */
        if (!translated) {
            const fallback = html.match(
                /"translatedText"\s*:\s*"([^"]+)"/i
            );

            if (fallback) {
                translated = fallback[1];
            }
        }

        /*
         * Another fallback for Google mobile page
         */
        if (!translated) {
            const bodyMatch = html.match(
                /<div[^>]*class=["'][^"']*result-shield-container[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
            );

            if (bodyMatch) {
                translated = bodyMatch[1];
            }
        }

        if (!translated) {
            return res.status(502).json({
                error: "Translation could not be extracted"
            });
        }

        /*
         * Remove HTML
         */
        translated = translated
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .trim();

        /*
         * Decode HTML entities
         */
        translated = decodeHtmlEntities(translated);

        return res.status(200).json({
            success: true,
            translatedText: translated,
            source: source,
            target: target
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Translation failed",
            message: error.message
        });
    }
}


/*
 * HTML entity decoder
 */
function decodeHtmlEntities(str) {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&#x2F;/gi, "/")

        .replace(
            /&#(\d+);/g,
            (_, dec) =>
                String.fromCharCode(Number(dec))
        )

        .replace(
            /&#x([0-9a-f]+);/gi,
            (_, hex) =>
                String.fromCharCode(
                    parseInt(hex, 16)
                )
        );
}
