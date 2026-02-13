import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable("x-powered-by");

const SUPABASE_ORIGIN = "https://eedoapedfzikyytoskjz.supabase.co";
const SUPABASE_WS = "wss://eedoapedfzikyytoskjz.supabase.co";
const CDN_ORIGIN = "https://cdn.jsdelivr.net";

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", CDN_ORIGIN],
        "style-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "connect-src": ["'self'", SUPABASE_ORIGIN, SUPABASE_WS, CDN_ORIGIN]
      }
    }
  })
);

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir, { index: "index.html", maxAge: "1h" }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor listo en http://localhost:${port}`);
});
