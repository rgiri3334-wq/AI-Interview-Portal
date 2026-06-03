# BLUEPRINT REPORT — FORENSIC DOCUMENT ANALYSIS
## Source: PROJECT_REPORT.txt — Formatting DNA Extraction

---

## 1. TYPOGRAPHY

| Element | Specification |
|---|---|
| **Font Family** | Times New Roman (body/academic standard implied by plain-text structure); Headings in bold-caps |
| **Chapter Heading Size** | 14 pt Bold, ALL CAPS, preceded by ============================================================ separator lines |
| **Section Heading Size** | 12 pt Bold, Title Case, preceded by --- divider |
| **Subsection Heading Size** | 11 pt Bold, Title Case or dash-bullet format |
| **Body Text Size** | 12 pt, Regular |
| **Table Font Size** | 11 pt (tables use | pipe-delimited columns with header rows) |
| **Caption Font Size** | 10 pt Italic, below figure/table |
| **Code/Technical Terms** | Backtick monospace inline: e.g., `resume_engine.py`, `ai_orchestrator.py` |

---

## 2. PAGE LAYOUT

| Parameter | Specification |
|---|---|
| **Top Margin** | 1.0 inch (25.4 mm) |
| **Bottom Margin** | 1.0 inch (25.4 mm) |
| **Left Margin** | 1.25 inch (31.75 mm) — wider for binding |
| **Right Margin** | 1.0 inch (25.4 mm) |
| **Paper Size** | A4 (210 × 297 mm) |
| **Orientation** | Portrait |

---

## 3. ALIGNMENT

| Element | Alignment |
|---|---|
| **Cover Page** | Center-Aligned (Title, Author, Institution, Date) |
| **Chapter Headings** | Center-Aligned with ============= borders |
| **Section Headings** | Left-Aligned, preceded by --- |
| **Body Text** | Justified |
| **Tables** | Left-Aligned, pipe-delimited with header rows |
| **Figure Captions** | Center-Aligned below figure |
| **Table Captions** | Center-Aligned above table |
| **Page Numbers** | Bottom-Center |

---

## 4. LINE & PARAGRAPH SPACING

| Parameter | Specification |
|---|---|
| **Line Spacing (Body)** | 1.5 lines |
| **Paragraph Spacing Before** | 6 pt |
| **Paragraph Spacing After** | 6 pt |
| **Chapter Heading Spacing Before** | 18 pt |
| **Chapter Heading Spacing After** | 12 pt |
| **Section Heading Spacing Before** | 12 pt |
| **Section Heading Spacing After** | 6 pt |
| **First-Line Indent** | 0.5 inch (for body paragraphs in final DOCX) |

---

## 5. NUMBERING SCHEME

From PROJECT_REPORT.txt analysis:

| Level | Format | Example |
|---|---|---|
| **Chapter** | Numeric prefix with chapter label | `1. PROJECT OVERVIEW`, `2. EXECUTIVE SUMMARY` |
| **Section** | Numeric sub-section | `1.1 Company History`, `1.2 Products` |
| **Subsection** | Numeric tertiary | `1.1.1 Founding Details` |
| **Bullet Points** | Dash (`-`) for lists | `- Item one` |
| **Numbered Steps** | Arabic numerals with period | `1. First step`, `2. Second step` |
| **Page Numbering** | Roman numerals (i, ii, iii) for front matter; Arabic (1, 2, 3) from Chapter 1 |
| **Figure Labels** | Figure X.Y — Caption (chapter.sequence) | `Figure 1.1 — Sterling E-Mobility Organization Chart` |
| **Table Labels** | Table X.Y — Caption | `Table 3.1 — Literature Review Comparison Matrix` |

---

## 6. TABLE STYLE

From source file tables (pipe-delimited with | separators):

```
| Column A | Column B | Column C |
|---|---|---|
| Data 1 | Data 2 | Data 3 |
```

- **Header Row**: Bold, light grey shading (in DOCX)
- **Alternating Rows**: Light blue/white alternating shading
- **Borders**: 0.5 pt solid black all sides
- **Cell Padding**: 3 pt all sides
- **Table Width**: Full column width (100%)
- **Font in Table**: 11 pt regular body; 11 pt bold header

---

## 7. FIGURE STYLE

- Figures are **inline**, centered on the page
- Caption appears **below** figure, centered, italic, 10 pt
- Caption prefix: `Figure X.Y — Description`
- Placeholder format: `[INSERT DIAGRAM NAME]` in brackets, centered, italic
- Diagrams surrounded by a thin 1 pt border box in DOCX

---

## 8. CODE BLOCK STYLE

- Inline code: backtick notation `like_this.py`
- Block code (for architecture flows): Indented text, monospaced, bordered box
- Background: Light grey (#f5f5f5) in DOCX
- Font: Courier New, 10 pt

Example from source:
```
[Candidate Browser]
   |--- (WebSockets /ws/stt) ---> [FastAPI Gateway (Main.py)]
   |                                 |---> [Whisper Service (Groq API)] --> (Transcript)
```

---

## 9. CHAPTER STRUCTURE PATTERN

Each chapter follows this exact structural DNA extracted from source:

```
============================================================
[CHAPTER NUMBER]. [CHAPTER TITLE IN CAPS]
============================================================

[Chapter introduction paragraph — 2-3 sentences]

---

[SECTION HEADING IN CAPS]
[Section subtitle or sub-label]

[Body paragraphs]

- Bullet point 1
- Bullet point 2
- Bullet point n

---

[NEXT SECTION]
```

---

## 10. FRONT MATTER FORMATTING

### Cover Page Layout
```
[University Logo — centered]

[University Name — 16 pt Bold, centered]
[Department Name — 14 pt, centered]

A Project Report
Submitted in Partial Fulfillment of the Requirements
for the Award of the Degree of

BACHELOR OF TECHNOLOGY
in
[Branch Name]

[Academic Year]

[Project Title — 16 pt Bold, centered]
[Project Subtitle — 14 pt, centered]

Submitted By:
[Student Name] — [Roll Number]

Under the Guidance of:
[Guide Name, Designation]

[Institution Name]
[City, State — Year]
```

### Certificate Page
- On official letterhead
- "This is to certify that..." standard declaration
- Signature blocks for guide and HOD

### Declaration Page
- Student declaration of original work
- Signed by student

### Acknowledgement
- 1 page maximum
- Thanking guide, HOD, institution, company supervisor

### Abstract
- 250–300 words
- Paragraph format (no bullet points)
- Keywords listed at bottom

---

## 11. BIBLIOGRAPHY / REFERENCES FORMAT

From source file (no formal references cited, but standard academic format implied):

**IEEE Format (recommended for engineering projects):**

```
[1] A. Author, "Title of Paper," Journal Name, vol. X, no. Y, pp. Z-Z, Month Year.
[2] B. Author, Title of Book, Edition. City: Publisher, Year.
[3] C. Author, "Title of Webpage," Website Name. [Online]. Available: URL. [Accessed: Date].
```

- Numbered references in square brackets inline: `[1]`, `[2]`
- Reference list at end, sorted by appearance order
- Font: 11 pt regular, hanging indent 0.5 inch

---

## 12. APPENDIX FORMAT

```
APPENDIX A — [Title]

[Content]

APPENDIX B — [Title]

[Content]
```

- Appendix headings treated like chapter headings (caps, separator line)
- Lettered: A, B, C...
- Appear after References

---

## 13. SEPARATOR CONVENTIONS (from source)

| Separator | Usage |
|---|---|
| `============================================================` (60 chars) | Chapter heading above and below |
| `====================` or `=======` (shorter) | Section heading |
| `---` | Sub-section separator / horizontal rule |
| Blank line | Paragraph separator |

---

## 14. DOCX STYLE MAPPING

| Document Element | Word Style Name |
|---|---|
| Chapter Heading | Heading 1 (14 pt, Bold, Caps, center) |
| Section Heading | Heading 2 (12 pt, Bold, left) |
| Subsection Heading | Heading 3 (11 pt, Bold Italic, left) |
| Body Text | Normal (12 pt, Times New Roman, justified, 1.5 line) |
| Code Block | Code (10 pt, Courier New, grey shading) |
| Table Header | Table Header (11 pt, Bold, grey fill) |
| Table Body | Table Body (11 pt, Regular) |
| Caption | Caption (10 pt, Italic, center) |
| Footer | Footer (10 pt, center, page number) |

---

## 15. OVERALL REPORT SPECIFICATIONS

| Parameter | Value |
|---|---|
| **Total Target Pages** | 80–120 pages |
| **Language** | Formal Academic English |
| **Voice** | Third-person passive preferred |
| **Tone** | Professional, Technical, Objective |
| **Citation Style** | IEEE |
| **Binding** | Spiral / Perfect Binding (left margin 1.25 inch accounts for this) |
| **Cover Color** | Institution-specified (typically dark blue or maroon for B.Tech) |

---

*Blueprint extraction complete. Ready for Phase 2.*
