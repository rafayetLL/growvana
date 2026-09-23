// "Download for Word" — turns a rendered doc page into a real .docx where the
// PROSE IS REAL TEXT and each diagram is an embedded PNG.
//
// Word is given a document, not a copy of the app. The on-screen page is a
// designed thing — tinted panels, accent headings, card borders, two-column
// grids — and none of that survives the trip usefully: Word has no CSS grid, so
// the columns collapse anyway, and a coloured card in a Word file reads as a
// broken import rather than as design. So the document is rebuilt from the
// ELEMENT names alone: headings, paragraphs, lists, definition lists, tables,
// figures. That is also why this needs no per-block handler — the source markup
// is already semantic, so a mapping for `h2`/`p`/`ul`/`table` covers a block
// that does not exist yet.
//
// The five things below are the exceptions, each a span or a number doing a job
// that only CSS was making legible. They are fixed up on a clone first.
//
// The file is built with the `docx` library, imported on click so it costs the
// app's first load nothing. Until 2026-09-16 it was HTML with Word's office
// namespaces served as `application/msword` — a `.doc` that only Word treated
// as a document. Google Docs imported it as a web page and dropped every
// diagram, because each rode inside the HTML as a `data:` URI; in a .docx each
// picture is its own file in `word/media/`, which Google Docs, Word and Pages
// all keep.

// The diagrams take every colour from CSS custom properties on `.doc-page`, so
// a serialized SVG resolves to nothing on its own. These are literal light
// values, used whatever mode the app is in.
//
// **The Word export is always light, unlike the PDF**, which follows the UI.
// That is not an oversight: a Word document on dark paper is wrong, and this
// export's whole job is to strip the design back to a plain document anyway.
//
// PAIRED WITH the `.doc-page` palette in the `@media print` block of index.css.
// If a `--doc-*` value changes there, change it here; nothing in the build
// catches the drift, and the symptom is a diagram whose accent no longer
// matches the light PDF of the same page.
const EXPORT_PALETTE = {
  '--doc-accent': '#0550C8',
  '--doc-accent-soft': '#E5EEFF',
  '--doc-warm': '#9B4A2B',
  '--doc-warm-soft': '#FBE8DC',
  '--doc-surface2': '#F5F7FA',
  '--doc-ink': '#0f172a',
  '--doc-ink2': '#334155',
  '--doc-ink3': '#5b6b80',
  '--doc-rule': '#d7dee8',
  '--doc-surface': '#ffffff',
};

// `currentColor` on a diagram inherits `.doc-page`'s text colour.
const CURRENT_COLOR = EXPORT_PALETTE['--doc-ink'];

// An SVG rendered inside an <img> is isolated: it cannot reach the page's
// webfonts, so Inter is unavailable however it was loaded. Helvetica Neue is the
// closest widely present match by metrics — Arial is a touch wider and is the
// fallback that could push a tight label past its box, which is the one failure
// worth knowing about if a diagram ever looks crowded in the export but not on
// screen. The class rules are copied here because page CSS does not travel either.
const SVG_FONT_CSS = `
  text { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .svg-title { font-weight: 600; letter-spacing: -.01em; }
  .svg-label { font-weight: 500; }
  .svg-mono  { font-family: 'Courier New', Courier, monospace; }
  .svg-tag   { font-weight: 600; letter-spacing: .09em; }
`;

// Width the images are placed at, in px. Letter with 1in margins is 6.5in of
// content, which is 624px at Word's 96dpi — so 620 fits without Word rescaling.
const IMAGE_WIDTH_PX = 620;

// Rasterize at 2x so the picture is still sharp when the document is printed or
// zoomed; it is placed at IMAGE_WIDTH_PX regardless.
const RASTER_SCALE = 2;

// US Letter with 1in margins, in twips (1/20 pt), which is what Word measures a
// page in. Table widths are given in the same unit because Google Docs ignores a
// percentage width on import.
const PAGE_TWIPS = { width: 12240, height: 15840, margin: 1440 };
const CONTENT_WIDTH_TWIPS = PAGE_TWIPS.width - 2 * PAGE_TWIPS.margin;

const BULLET_LIST = 'doc-bullets';
const NUMBERED_LIST = 'doc-numbers';

/** One diagram, serialized standalone with its colours and fonts resolved. */
function resolveSvgMarkup(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = SVG_FONT_CSS;
  clone.insertBefore(style, clone.firstChild);

  let markup = new XMLSerializer().serializeToString(clone);
  for (const [name, value] of Object.entries(EXPORT_PALETTE)) {
    markup = markup.split(`var(${name})`).join(value);
  }
  return markup.split('currentColor').join(CURRENT_COLOR);
}

/** The viewBox's own width and height, which set the image's aspect ratio. */
function svgBox(svg) {
  const [, , w, h] = (svg.getAttribute('viewBox') || '0 0 1000 600')
    .split(/[\s,]+/)
    .map(Number);
  return { width: w || 1000, height: h || 600 };
}

/** One diagram as PNG bytes, drawn on white rather than left transparent. */
function svgToPng(svg) {
  const { width, height } = svgBox(svg);
  const markup = resolveSvgMarkup(svg);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * RASTER_SCALE);
        canvas.height = Math.round(height * RASTER_SCALE);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('the diagram could not be encoded'));
            return;
          }
          blob.arrayBuffer().then((buffer) => {
            resolve({
              data: new Uint8Array(buffer),
              width: IMAGE_WIDTH_PX,
              height: Math.round(IMAGE_WIDTH_PX * (height / width)),
            });
          }, reject);
        }, 'image/png');
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('the diagram could not be drawn'));
    };
    img.src = url;
  });
}

/** Put a line break after a bold lead-in that only CSS was making a block. */
function breakAfterLead(el) {
  const lead = el.querySelector(':scope > b');
  if (lead && lead.nextSibling) lead.after(document.createElement('br'));
}

/** Swap one element's tag, keeping its children. */
function retag(el, tagName) {
  const next = document.createElement(tagName);
  while (el.firstChild) next.appendChild(el.firstChild);
  el.replaceWith(next);
  return next;
}

/**
 * A plain-document clone of the page: no classes, no styles, no colour.
 *
 * Each diagram becomes an `<img data-diagram="N">`, N being its position among
 * the page's SVGs — the clone's SVGs sit in the same order as the live ones,
 * which is what lets the rasterized pictures be matched by index rather than by
 * an id the markup does not carry.
 */
function toPlainDocument(root) {
  const clone = root.cloneNode(true);
  clone.querySelectorAll('.no-print, script, style').forEach((n) => n.remove());

  // --- the five fix-ups that must happen while the classes still exist ---

  // 1. The section number is a span beside the heading; in a document it belongs
  //    in the heading itself, or Word's navigation pane shows "The sync" with a
  //    stray "02" on the line above it.
  clone.querySelectorAll('.doc-sec-head').forEach((head) => {
    const num = head.querySelector('.doc-sec-num');
    const h2 = head.querySelector('h2');
    if (num && h2) {
      h2.textContent = `${num.textContent.trim()}. ${h2.textContent}`;
      num.remove();
    }
  });

  // 2. Same for a specialist panel, plus its "Owns:" tag, which is positioned
  //    into the header by CSS and would otherwise land mid-heading.
  clone.querySelectorAll('.doc-panel').forEach((panel) => {
    const head = panel.querySelector(':scope > header');
    if (!head) return;
    const num = head.querySelector('.doc-panel-num');
    const h3 = head.querySelector('h3');
    const owns = head.querySelector('.doc-panel-owns');
    if (num && h3) {
      h3.textContent = `${num.textContent.trim()}. ${h3.textContent}`;
      num.remove();
    }
    if (owns) {
      const line = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = owns.textContent.trim();
      line.appendChild(em);
      head.after(line);
      owns.remove();
    }
    // The header is a styling wrapper only; unwrap it so the h3 is a direct
    // child and Word reads the outline correctly.
    head.replaceWith(...head.childNodes);
  });

  // 3. Spans that only LOOK like blocks because CSS says `display: block`.
  clone.querySelectorAll('.doc-depth-note, .doc-eg').forEach((span) => {
    breakAfterLead(span);
    retag(span, 'p');
  });
  clone.querySelectorAll('.doc-fgroup').forEach(breakAfterLead);

  // 4. The benchmark lists are a two-column grid built from a <dl>. Stacked they
  //    read as an unlabelled run of lines, so they become real Word tables.
  clone.querySelectorAll('.doc-bench').forEach((dl) => {
    const table = document.createElement('table');
    const body = document.createElement('tbody');
    let row = null;
    Array.from(dl.children).forEach((child) => {
      if (child.tagName === 'DT') {
        row = document.createElement('tr');
        const cell = document.createElement('td');
        const bold = document.createElement('b');
        bold.innerHTML = child.innerHTML;
        cell.appendChild(bold);
        row.appendChild(cell);
        body.appendChild(row);
      } else if (child.tagName === 'DD' && row) {
        const cell = document.createElement('td');
        cell.innerHTML = child.innerHTML;
        row.appendChild(cell);
      }
    });
    table.appendChild(body);
    dl.replaceWith(table);
  });

  // 5. A callout is a tinted box on screen. In a document it is an indented
  //    note with a rule down the side, which is what a blockquote already is.
  clone.querySelectorAll('.doc-note').forEach((note) => retag(note, 'blockquote'));

  // --- column widths, which live in inline styles the strip below removes ---
  clone.querySelectorAll('th, td').forEach((cell) => {
    const width = cell.style.width;
    if (width.endsWith('%')) cell.setAttribute('data-width', String(parseFloat(width)));
  });

  // --- the diagrams ---
  clone.querySelectorAll('.doc-scroller').forEach((s) => s.replaceWith(...s.childNodes));
  clone.querySelectorAll('figcaption').forEach((cap) => {
    if (!cap.textContent.trim()) cap.remove();
  });
  clone.querySelectorAll('svg').forEach((svg, i) => {
    const img = document.createElement('img');
    img.setAttribute('data-diagram', String(i));
    img.setAttribute('alt', svg.getAttribute('aria-label') || '');
    svg.replaceWith(img);
  });

  // --- everything the design was carried by, removed ---
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  clone.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
    el.removeAttribute('id');
  });

  return clone;
}

// --- the .docx itself ---

// Tags that start a new paragraph (or a table, or a picture). Anything else —
// a text node, <b>, <em>, <span>, <br> — is inline and joins the paragraph it
// sits in.
const BLOCK_TAGS = new Set([
  'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'IMG', 'LI', 'MAIN',
  'NAV', 'OL', 'P', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
]);

// h1 is the page title; the numbered sections are h2, so they take Heading 1
// and head the navigation pane rather than sitting one level under the title.
const HEADING_FOR_TAG = {
  H1: 'TITLE',
  H2: 'HEADING_1',
  H3: 'HEADING_2',
  H4: 'HEADING_3',
  H5: 'HEADING_4',
  H6: 'HEADING_4',
};

/** Flatten one inline node into text pieces carrying their own formatting. */
function collectInline(node, format, pieces) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Collapse source whitespace the way a browser does, but leave a
    // non-breaking space alone.
    pieces.push({ ...format, text: node.nodeValue.replace(/[ \t\n\r\f]+/g, ' ') });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  let next = format;
  switch (node.tagName) {
    case 'BR':
      pieces.push({ break: true });
      return;
    case 'B':
    case 'STRONG':
      next = { ...format, bold: true };
      break;
    case 'EM':
    case 'I':
      next = { ...format, italics: true };
      break;
    case 'CODE':
    case 'KBD':
      next = { ...format, font: 'Courier New' };
      break;
  }
  node.childNodes.forEach((child) => collectInline(child, next, pieces));
}

/** Drop spaces at a line's edges and the doubled ones where two pieces meet. */
function normalizePieces(pieces) {
  const out = [];
  const trimEnd = () => {
    while (out.length && !out[out.length - 1].break) {
      const last = out[out.length - 1];
      last.text = last.text.replace(/ +$/, '');
      if (last.text) return;
      out.pop();
    }
  };
  let afterSpace = true;
  for (const piece of pieces) {
    if (piece.break) {
      trimEnd();
      out.push(piece);
      afterSpace = true;
      continue;
    }
    const text = afterSpace ? piece.text.replace(/^ +/, '') : piece.text;
    if (!text) continue;
    out.push({ ...piece, text });
    afterSpace = text.endsWith(' ');
  }
  trimEnd();
  return out;
}

/** A paragraph from inline pieces, or null when there is no text in them. */
function paragraphFrom(docx, ctx, pieces) {
  const runs = normalizePieces(pieces).map(({ break: isBreak, ...piece }) =>
    isBreak ? new docx.TextRun({ break: 1 }) : new docx.TextRun({ ...ctx.run, ...piece }),
  );
  if (!runs.length) return null;
  return new docx.Paragraph({ ...ctx.para, children: runs });
}

/** Every block inside an element, grouping loose inline content into paragraphs. */
function blocksOf(docx, el, ctx) {
  const blocks = [];
  let pieces = [];
  const flush = () => {
    const paragraph = paragraphFrom(docx, ctx, pieces);
    if (paragraph) blocks.push(paragraph);
    pieces = [];
  };
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(child.tagName)) {
      flush();
      blocks.push(...blockFrom(docx, child, ctx));
    } else {
      collectInline(child, {}, pieces);
    }
  });
  flush();
  return blocks;
}

/** One block-level element as docx paragraphs and tables. */
function blockFrom(docx, el, ctx) {
  const tag = el.tagName;

  if (HEADING_FOR_TAG[tag]) {
    return blocksOf(docx, el, {
      ...ctx,
      para: { heading: docx.HeadingLevel[HEADING_FOR_TAG[tag]] },
    });
  }

  switch (tag) {
    case 'UL':
    case 'OL': {
      const level = ctx.listLevel + 1;
      const numbering =
        tag === 'UL'
          ? { reference: BULLET_LIST, level }
          : // A fresh instance per list, or every numbered list would continue
            // counting from the one before it.
            { reference: NUMBERED_LIST, level, instance: ++ctx.counter.lists };
      return Array.from(el.children).flatMap((li) =>
        blocksOf(docx, li, {
          ...ctx,
          listLevel: level,
          para: { ...ctx.para, numbering, spacing: { after: 80 } },
        }),
      );
    }

    case 'TABLE':
      return [tableFrom(docx, el, ctx), new docx.Paragraph({ spacing: { after: 0 } })];

    case 'BLOCKQUOTE':
      return blocksOf(docx, el, {
        ...ctx,
        para: {
          ...ctx.para,
          spacing: { before: 120, after: 160 },
          indent: { left: 300 },
          border: { left: { style: docx.BorderStyle.SINGLE, size: 12, color: 'BFBFBF', space: 10 } },
        },
      });

    case 'IMG': {
      const shot = ctx.images[Number(el.getAttribute('data-diagram'))];
      if (!shot) return [];
      const alt = el.getAttribute('alt') || '';
      return [
        new docx.Paragraph({
          keepNext: true,
          spacing: { before: 160, after: 80 },
          children: [
            new docx.ImageRun({
              type: 'png',
              data: shot.data,
              transformation: { width: shot.width, height: shot.height },
              altText: { name: alt || 'Diagram', title: alt, description: alt },
            }),
          ],
        }),
      ];
    }

    case 'FIGCAPTION':
      return blocksOf(docx, el, {
        ...ctx,
        para: { spacing: { after: 280 } },
        run: { ...ctx.run, italics: true, size: 19, color: '404040' },
      });

    case 'DT':
      return blocksOf(docx, el, {
        ...ctx,
        para: { ...ctx.para, keepNext: true, spacing: { before: 140, after: 0 } },
        run: { ...ctx.run, bold: true },
      });

    case 'DD':
      return blocksOf(docx, el, { ...ctx, para: { ...ctx.para, indent: { left: 360 } } });

    case 'HR':
      return [
        new docx.Paragraph({
          border: { bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 1 } },
        }),
      ];

    // A paragraph, or a wrapper (div, section, dl, li outside a list, …) whose
    // contents decide for themselves.
    default:
      return blocksOf(docx, el, ctx);
  }
}

/** A table with fixed column widths, its header row repeated across pages. */
function tableFrom(docx, table, ctx) {
  const rows = Array.from(table.querySelectorAll('tr')).filter((tr) => tr.closest('table') === table);
  const columns = Math.max(1, ...rows.map((tr) => tr.children.length));

  // The source's percentage widths where every column has one, otherwise even.
  const declared = rows.length
    ? Array.from(rows[0].children).map((cell) => Number(cell.getAttribute('data-width')))
    : [];
  const percents =
    declared.length === columns && declared.every((w) => w > 0)
      ? declared
      : Array(columns).fill(100 / columns);
  const total = percents.reduce((a, b) => a + b, 0);
  const columnWidths = percents.map((p) => Math.round((p / total) * CONTENT_WIDTH_TWIPS));

  const border = { style: docx.BorderStyle.SINGLE, size: 4, color: '808080' };
  const cellCtx = {
    ...ctx,
    listLevel: -1,
    para: { spacing: { after: 40, line: 240 } },
    run: { size: 20 },
  };

  return new docx.Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: docx.WidthType.DXA },
    columnWidths,
    layout: docx.TableLayoutType.FIXED,
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: rows.map(
      (tr) =>
        new docx.TableRow({
          tableHeader: tr.parentElement?.tagName === 'THEAD',
          cantSplit: true,
          children: Array.from(tr.children).map((cell, i) => {
            const bold = cell.tagName === 'TH';
            const blocks = blocksOf(docx, cell, bold ? { ...cellCtx, run: { ...cellCtx.run, bold } } : cellCtx);
            return new docx.TableCell({
              width: { size: columnWidths[i] ?? columnWidths[0], type: docx.WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: blocks.length ? blocks : [new docx.Paragraph({})],
            });
          }),
        }),
    ),
  });
}

/** Bullet or number levels, each indented one step further than the last. */
function listLevels(docx, format, symbols) {
  return symbols.map((text, level) => ({
    level,
    format,
    text,
    alignment: docx.AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } },
  }));
}

// Word's own defaults, near enough that the file looks native rather than like a
// web page someone pasted in. Sizes are in half-points and spacing in twips,
// because that is how a .docx stores them.
function documentStyles() {
  // The outline level is what a navigation pane and an importer read to know a
  // paragraph is a heading; the style's name alone is not always enough.
  const heading = (size, before, after, outlineLevel) => ({
    run: { font: 'Calibri', size, bold: true, color: '000000' },
    paragraph: { spacing: { before, after }, keepNext: true, keepLines: true, outlineLevel },
  });
  return {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: '000000' },
        paragraph: { spacing: { after: 160, line: 276 } },
      },
      title: heading(44, 0, 120),
      heading1: heading(32, 440, 140, 0),
      heading2: heading(26, 320, 100, 1),
      heading3: heading(22, 260, 80, 2),
      heading4: heading(22, 200, 60, 3),
    },
  };
}

/** The whole document as a .docx Blob. `root` is the rendered `.doc-page` element. */
export async function buildWordDocument(root, title) {
  const docx = await import('docx');

  const svgs = Array.from(root.querySelectorAll('.doc-fig svg'));
  const images = [];
  // Sequentially, not in parallel: each one decodes a full-size bitmap, and a
  // handful of those at once on a low-memory machine is how the canvas comes
  // back blank with nothing thrown.
  for (const svg of svgs) images.push(await svgToPng(svg));

  const plain = toPlainDocument(root);
  const children = blocksOf(docx, plain, {
    images,
    listLevel: -1,
    counter: { lists: 0 },
    para: {},
    run: {},
  });

  const doc = new docx.Document({
    creator: 'Growvana',
    title,
    styles: documentStyles(),
    numbering: {
      config: [
        {
          reference: BULLET_LIST,
          levels: listLevels(docx, docx.LevelFormat.BULLET, ['•', '◦', '▪']),
        },
        {
          reference: NUMBERED_LIST,
          levels: listLevels(docx, docx.LevelFormat.DECIMAL, ['%1.', '%2.', '%3.']),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_TWIPS.width, height: PAGE_TWIPS.height },
            margin: {
              top: PAGE_TWIPS.margin,
              right: PAGE_TWIPS.margin,
              bottom: PAGE_TWIPS.margin,
              left: PAGE_TWIPS.margin,
            },
          },
        },
        children,
      },
    ],
  });

  return docx.Packer.toBlob(doc);
}

/** Build it and hand it to the browser as a download. */
export async function downloadWordDoc(root, title) {
  const blob = await buildWordDocument(root, title);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick rather than immediately — Safari has not started
  // reading the blob by the time click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ----------------------------------------------------------------------------
// REPLACED 2026-09-16 by the .docx builder above. The export was HTML with
// Word's office namespaces, downloaded as `.doc` with an `application/msword`
// type, and each diagram an <img> whose src was a PNG data URI. Google Docs
// imports that as a web page and drops the pictures. To restore: uncomment
// these two, have svgToPng resolve `canvas.toDataURL('image/png')` as `dataUrl`,
// set that as the <img src> (with width/height) in toPlainDocument, and make
// downloadWordDoc wrap buildWordHtml's string in an `application/msword` Blob
// named `.doc`.
//
// const WORD_CSS = `
//   @page WordSection1 { size: 8.5in 11in; margin: 1in; }
//   div.WordSection1 { page: WordSection1; }
//   body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000000; }
//   h1 { font-size: 22pt; font-weight: 700; margin: 0 0 6pt; }
//   h2 { font-size: 16pt; font-weight: 700; margin: 22pt 0 7pt; page-break-after: avoid; }
//   h3 { font-size: 13pt; font-weight: 700; margin: 16pt 0 5pt; page-break-after: avoid; }
//   h4 { font-size: 11pt; font-weight: 700; margin: 13pt 0 4pt; page-break-after: avoid; }
//   p { margin: 0 0 8pt; }
//   ul { margin: 0 0 8pt; padding-left: 22pt; }
//   li { margin: 0 0 4pt; }
//   dl { margin: 0 0 8pt; }
//   dt { font-weight: 700; margin: 7pt 0 0; }
//   dd { margin: 0 0 0 18pt; }
//   table { border-collapse: collapse; width: 100%; margin: 0 0 10pt; }
//   td, th { border: 0.5pt solid #808080; padding: 4pt 7pt; vertical-align: top; text-align: left; font-size: 10pt; }
//   th { font-weight: 700; }
//   blockquote { margin: 9pt 0 11pt; padding: 0 0 0 11pt; border-left: 2pt solid #bfbfbf; }
//   figure { margin: 11pt 0 15pt; page-break-inside: avoid; }
//   figcaption { font-size: 9.5pt; font-style: italic; color: #404040; margin: 5pt 0 0; }
//   hr { border: none; border-top: 0.5pt solid #bfbfbf; margin: 14pt 0; }
// `;
//
// export async function buildWordHtml(root, title) {
//   const svgs = Array.from(root.querySelectorAll('.doc-fig svg'));
//   const images = [];
//   for (const svg of svgs) images.push(await svgToPng(svg));
//
//   const plain = toPlainDocument(root, images);
//
//   return [
//     '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
//     ' xmlns:w="urn:schemas-microsoft-com:office:word"',
//     ' xmlns="http://www.w3.org/TR/REC-html40">',
//     '<head><meta charset="utf-8">',
//     `<title>${title}</title>`,
//     '<!--[if gte mso 9]><xml><w:WordDocument>',
//     '<w:View>Print</w:View><w:Zoom>100</w:Zoom>',
//     '</w:WordDocument></xml><![endif]-->',
//     `<style>${WORD_CSS}</style>`,
//     '</head><body><div class="WordSection1">',
//     plain.innerHTML,
//     '</div></body></html>',
//   ].join('');
// }
