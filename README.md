# Almost — web reader

A static, page-turning reader for **Almost** by M. Farouk. The whole book (text laid out exactly as in the manuscript PDF, plus cover art) is baked into a single HTML file with no runtime dependencies.

**Live site:** enable GitHub Pages (Settings → Pages → *Deploy from a branch* → `main` / root) and open the URL GitHub gives you.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The built reader (served by GitHub Pages). |
| `book.html` | Identical copy of `index.html`, kept for existing links. |
| `Almost_Manuscript.pdf` | Source manuscript (232 pages, 12 chapters). |
| `reader.template.html` | Reader UI, styles and script. `/*__BOOK_DATA__*/` is replaced at build time. |
| `build-reader.mjs` | Reads the PDF, extracts pages/chapters, embeds cover art, writes `index.html` and `book.html`. |
| `assets/cover-art.json` | Front, spine and back cover crops (base64 JPEG) used by the build. |

## Updating the book

1. Replace `Almost_Manuscript.pdf` with the new export (keep this exact filename, e.g. rename `Almost_Manuscript_Updated.pdf` before building).
2. Build:

   ```bash
   npm install
   npm run build
   ```

3. Commit and push `index.html` and `book.html` (and the PDF).

Latest build: 232 pages, 12 chapters, about 81,800 words.

> When uploading files through the GitHub web UI, keep the real names: `reader.template.html` (dot, not underscore) and `.gitignore` (leading dot). The build fails if the template name differs.

Chapters are detected automatically from lines that read `CHAPTER ONE`, `CHAPTER TWO`, … followed by the chapter title on the next line. The build prints a summary (pages, words, chapters) so you can confirm the numbers.

### Changing the cover

Put the full wrap-around cover image at `assets/Almost__A_Sunset_cover.png` and run the build; it will re-crop the front, spine and back. Without that file, the build uses `assets/cover-art.json`.

## Page turning

Each turning leaf is built from thin vertical strips hinged to one another, so the paper bows as it turns instead of flipping like a rigid card. The free edge trails the spine, every strip is lit by its own angle, and a soft shadow follows the edge across the page beneath. Dragging with a finger or mouse follows the paper live; clicking, arrow keys and the edge buttons play a full eased turn. The effect honours the system “reduce motion” setting. The curl depth is the `BEND` constant in `reader.template.html`.

## Reader controls

Arrow keys / swipe / click page edges to turn pages · `+` / `-` / `0` change text size · light/dark toggle · chapter list · progress is saved in the browser.
