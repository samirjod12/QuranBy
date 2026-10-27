# QuranBy

Modern glassy Windows app: **Quran theme · Hadith Books · Quran Read · Hadith read · Text Quran · Settings**.
It remembers where you stopped in every reader (Quran PDF, Hadith PDF, Text Quran).

## Get the .exe (free, no coding)

1. Create a free GitHub account → **New repository** (any name, e.g. `quranby`).
2. On the repository page click **Add file → Upload files**, drag in **everything inside this folder**
   (including the hidden `.github` folder), then **Commit changes**.
   - If `.github` won't drag in: **Add file → Create new file**, type `.github/workflows/build.yml`, paste the contents of that file.
3. Open the **Actions** tab → **Build QuranBy EXE** → wait ~3–5 minutes (green tick).
   (If it did not start: click the workflow → **Run workflow**.)
4. Click the finished run → **Artifacts → QuranBy-windows-exe** → download, unzip:
   - `QuranBy-Setup-1.0.0.exe` – installer
   - `QuranBy-Portable-1.0.0.exe` – no install, just run

Windows may show "unknown publisher" (the app is not code-signed): **More info → Run anyway**.

## Add Quran themes / Hadith books — just upload PDFs (no code)

The repo has two folders: **`Quran-Theme`** and **`Hadith-Books`**.

1. Open the folder on GitHub → **Add file → Upload files** → drop your PDFs → **Commit changes**.
2. Wait ~1 minute (Actions tab → "Update app library" turns green). It writes `catalog.json` by itself.
3. Open the app → **Settings → Library → Update now** (or just restart it). Your PDFs appear in the
   **Quran theme** / **Hadith Books** tab with **Download ⬇️**.

- The file name becomes the title (`Sahih_Bukhari.pdf` → "Sahih Bukhari").
- Optional preview picture: upload an image with the same name (`Sahih_Bukhari.jpg`).
- Repo must be **Public**. A single file uploaded in the browser can be up to 25 MB (bigger: use GitHub Desktop, limit 100 MB).
- No new .exe is needed when you add PDFs. The exe only has to be built once (it already knows your repo link).

## Other ways to add themes / books

The Quran themes and Hadith books are **PDF files**. You only need a link to each PDF.

### Way 1 – inside the app (easiest)
**Settings → Library → Add by link** → choose *Quran theme* or *Hadith book*, type a name, paste the link, **Add**.
Then open the **Quran theme** or **Hadith Books** tab and press **Download ⬇️**.

Links that work (just paste them as they are, the app converts them):
- Direct link ending in `.pdf`
- Google Drive: upload PDF → Share → *Anyone with the link* → copy link (small/medium files; very large Drive files show a warning page and will not download)
- GitHub: open the PDF in your repo → copy the page address (the `.../blob/...` link)
- Dropbox share link

Have the PDF on your computer already? **Settings → Library → Choose PDF…**

### Way 2 – one list for everybody (update without rebuilding)
1. Put your PDFs anywhere with a link (for example in a GitHub repo, **Add file → Upload files**).
2. In this project, click **catalog.json → pencil icon (edit)** and add lines like this (copy/paste, change the text):
```json
{
  "themes": [
    { "title": "Green Mushaf", "url": "https://example.com/green.pdf", "thumb": "" }
  ],
  "hadith": [
    { "title": "Sahih Bukhari", "url": "https://example.com/bukhari.pdf", "thumb": "" }
  ]
}
```
   - Put a comma `,` between items, none after the last one.
   - `thumb` is an optional picture link for the preview. Leave `""` to auto-generate it after download.
3. Make it live for all apps: open `config.json`, put your raw link inside the quotes:
   `https://raw.githubusercontent.com/YOUR-NAME/YOUR-REPO/main/catalog.json`
   (or paste the same link in the app: **Settings → Library → Online catalog link → Update now**).
   After that, every time you edit `catalog.json` on GitHub, the app picks it up – **no new .exe needed**.

## Text Quran
Uses the free API from <https://github.com/fawazahmed0/quran-api> (hundreds of Arabic and translation editions, many languages).
Pick the Arabic edition and the translation edition at the top, search words across the whole Quran, tap a surah on the left.
Needs internet.

## Customize (Settings)
Version name, light/dark/auto, accent colour, background style, glass blur & opacity, interface size, Arabic font and sizes,
translation on/off, verse numbers, PDF zoom, remember-position switch, add/remove library items.

## Run on your PC for testing (optional)
Install Node.js, then in this folder: `npm install` and `npm start`.
