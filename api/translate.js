export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // OPTIONS request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only POST
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Only POST method is allowed"
        });
    }

    try {
        const {
            text,
            source,
            target
        } = req.body || {};

        // Validate
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

        const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Google Translate API key is not configured"
            });
        }

        // Google Translation API
        const url =
            "https://translation.googleapis.com/language/translate/v2" +
            "?key=" +
            encodeURIComponent(apiKey);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: text,
                source: source || undefined,
                target: target,
                format: "text"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "Google Translate API error"
            });
        }

        const translation =
            data?.data?.translations?.[0];

        if (!translation) {
            return res.status(500).json({
                error: "Translation not returned"
            });
        }

        return res.status(200).json({
            success: true,
            translatedText: translation.translatedText,
            source: source || translation.detectedSourceLanguage || null,
            target: target
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
}
