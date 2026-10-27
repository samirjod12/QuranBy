<div align="center">

# 📖 QuranBy

**A modern, glassy Windows app for reading the Quran and Hadith — and it remembers exactly where you stopped.**

![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white)
![Built with](https://img.shields.io/badge/built%20with-Electron-47848F?logo=electron&logoColor=white)
![Build](https://img.shields.io/badge/build-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Features

| Tab | What it does |
|---|---|
| 🎨 **Quran theme** | Browse Quran PDF designs with preview thumbnails. Download, then select. |
| 📚 **Hadith Books** | Browse Hadith book PDFs. Shows file size and download state. |
| 📖 **Quran Read** | Reads your selected Quran PDF. Zoom, jump to page, **resumes at your last spot**. |
| 📜 **Hadith read** | Reads your Hadith PDFs, with a **Continue reading** shortcut. |
| 🔤 **Text Quran** | Arabic text with translations in many languages, search, surah list. **Resumes at your last verse**. |
| ⚙️ **Settings** | Version name, themes, glass effect, fonts, sizes, library and more. |

- Glassy blur design with animated backgrounds, dark / light / auto mode and any accent colour
- Saves your reading position in every reader, automatically
- Add Quran themes and Hadith books **without writing any code**
- Free to build and run, no server needed

---

## 🚀 Get the .exe (free, no coding)

1. Create a free account at [github.com](https://github.com) and make a **new repository** (set it to **Public**).
2. Click **Add file → Upload files**, drag in **everything from this project** (including the hidden `.github` folder), then **Commit changes**.
   - If `.github` will not drag in: **Add file → Create new file**, type `.github/workflows/build.yml` and paste in the contents of that file. Repeat for `update-catalog.yml`.
3. Open the **Actions** tab → **Build QuranBy EXE** → **Run workflow**. Wait about 3–5 minutes for the green tick.
4. Open the finished run → **Artifacts → QuranBy-windows-exe** → download and unzip:
   - `QuranBy-Setup-1.0.0.exe` — installer
   - `QuranBy-Portable-1.0.0.exe` — no install, just run

> Windows may say **"unknown publisher"** because the app is not code-signed. Click **More info → Run anyway**.

---

## 📚 Add Quran themes and Hadith books (just upload PDFs)

The repository has two folders:

```
Quran-Theme/    ← put Quran PDFs here
Hadith-Books/   ← put Hadith book PDFs here
```

1. Open a folder on GitHub → **Add file → Upload files** → drop your PDFs → **Commit changes**.
2. Wait about a minute. The **Update app library** action writes `catalog.json` for you.
3. In the app: **Settings → Library → Update now** (or restart). Your files appear with **Download ⬇️**.

**Tips**
- The file name becomes the title: `Sahih_Bukhari.pdf` → *Sahih Bukhari*.
- Want your own preview picture? Upload an image with the same name: `Sahih_Bukhari.jpg`. Otherwise the app makes one from page 1 after download.
- The repo must be **Public**.
- Browser uploads allow up to **25 MB per file**. For larger PDFs use GitHub Desktop (up to 100 MB).
- Adding PDFs never needs a new `.exe`.

### Other ways to add a book
- **By link:** Settings → Library → *Add by link*. Works with direct `.pdf` links, GitHub file links, Dropbox, and Google Drive share links (small and medium files).
- **From your computer:** Settings → Library → *Choose PDF…*
- **Edit `catalog.json` by hand:**
  ```json
  {
    "themes": [{ "title": "Green Mushaf", "url": "https://example.com/green.pdf", "thumb": "" }],
    "hadith": [{ "title": "Sahih Bukhari", "url": "https://example.com/bukhari.pdf", "thumb": "" }]
  }
  ```

---

## 🔤 Text Quran

Powered by the free [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api) (served from the jsDelivr CDN).

- Choose an **Arabic edition** and a **translation edition** from many languages
- Search words across the whole Quran
- Tap any surah in the list. Needs an internet connection.

---

## 🎛️ Settings

Version name · Dark / Light / Auto · accent colour · background style · glass blur and opacity · interface size · Arabic font and text size · translation size · show or hide translation and verse numbers · PDF zoom · remember-position switch · library manager · reset.

---

## 🗂️ Project structure

```
quranby/
├─ main.js            Electron main process (downloads, files)
├─ preload.js         Safe bridge to the UI
├─ renderer/          UI (index.html, style.css, app.js)
├─ Quran-Theme/       Your Quran PDFs
├─ Hadith-Books/      Your Hadith PDFs
├─ catalog.json       Library list (auto-generated)
├─ config.json        Your repo's catalog link (auto-generated)
├─ scripts/           make-catalog.js
└─ .github/workflows/ build.yml, update-catalog.yml
```

## 🛠️ Run locally (optional)

```bash
npm install
npm start          # run the app
npm run dist       # build the Windows .exe
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| Build did not start | Actions tab → *Build QuranBy EXE* → **Run workflow** |
| New PDF not showing | Wait for the green tick in Actions, then Settings → Library → **Update now** |
| Download fails | Make sure the repo is **Public** and the link opens a PDF directly |
| Text Quran will not load | Check your internet connection and press **Retry** |

## 📄 License

MIT. Quran text data from [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api); check its license for the editions you use.
