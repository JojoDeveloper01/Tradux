import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { t, getCurrentLanguage } from "tradux";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
    const app = express();

    // 1️⃣ Vite dev server in middleware mode
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom"
    });
    app.use(vite.middlewares);

    // 2️⃣ Catch-all route for HTML pages
    app.use(/.*/, async (req, res, next) => {
        try {
            const url = req.originalUrl;

            let template = await fs.readFile(path.resolve(__dirname, "index.html"), "utf-8");
            template = await vite.transformIndexHtml(url, template);

            const traduxLang =
                req.headers.cookie?.split("; ").find(c => c.startsWith("tradux_lang="))?.split("=")[1] || "en";
            const lang = await getCurrentLanguage(traduxLang);
            const title = t.navigation.home;

            const html = template
                .replace(/<html lang=".*?">/, `<html lang="${lang}">`)
                .replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

            res.status(200).set({ "Content-Type": "text/html" }).end(html);
        } catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });

    app.listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
}

createServer();