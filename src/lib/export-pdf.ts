"use client"

import { jsPDF } from "jspdf";
import { PDFOptions } from "@/types";

const PT_TO_MM = 0.3528;
const LINE_SPACING = 1.5;
const LINE_GAP = 2;    
const BLOCK_GAP = 4;    
const SECTION_GAP = 7; 
const MARGIN = 20;

function lh(fontSize: number): number {
  return fontSize * PT_TO_MM * LINE_SPACING;
}

function stripEmoji(text: string): string {
  return text   
    .replace(/🔴/g, "[!]")
    .replace(/🟢/g, "[OK]")
    .replace(/🟡/g, "[~]")
    .replace(/⚠️/g, "[WARN]")
    .replace(/✅/g, "[OK]")
    .replace(/❌/g, "[X]")
    .replace(/🔵/g, "[-]")
    .replace(
      /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function exportHtmlToPdf(html: string, options: PDFOptions = {}): void {
  const {
    title = "Battlecard",
    subtitle = `Generated ${new Date().toLocaleDateString()}`,
    filename = "battlecard.pdf",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(stripEmoji(title), MARGIN, 12);

  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  doc.text(stripEmoji(subtitle), MARGIN, 20);

  y = 34;

  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const elements = dom.body.children;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const renderTextBlock = (
    text: string,
    fontSize: number,
    style: string,
    color: [number, number, number] = [30, 30, 30],
    indent = 0
  ): number => {
    const clean = stripEmoji(text);
    if (!clean) return 0;

    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    const lineHeight = lh(fontSize);
    const lines = doc.splitTextToSize(clean, contentWidth - indent);
    const blockHeight = lines.length * lineHeight;

    ensureSpace(blockHeight);

    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], MARGIN + indent, y);
      y += lineHeight;
    }

    return blockHeight;
  };

  let seenFirstH1 = false;
  let seenFirstHr = false;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "").trim();

    if (!text && tag !== "hr") continue;

    switch (tag) {
      case "h1": {
        if (!seenFirstH1) {
          seenFirstH1 = true;
          break;
        }
        y += BLOCK_GAP;
        renderTextBlock(text, 15, "bold", [20, 20, 20]);
        y += LINE_GAP;
        break;
      }
      case "h2": {
        y += SECTION_GAP;
        ensureSpace(lh(11.5) + BLOCK_GAP);
        renderTextBlock(text, 11.5, "bold", [35, 35, 35]);
        y += BLOCK_GAP;
        break;
      }
      case "h3": {
        y += BLOCK_GAP;
        ensureSpace(lh(10.5) + BLOCK_GAP);
        renderTextBlock(text, 10.5, "bold", [50, 50, 50]);
        y += LINE_GAP;
        break;
      }
      case "hr": {
        if (!seenFirstHr) {
          seenFirstHr = true;
          break;
        }
        const HR_BEFORE = 4;
        const HR_AFTER = 6;
        ensureSpace(HR_BEFORE + HR_AFTER);
        y += HR_BEFORE;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, MARGIN + 100, y);
        y += HR_AFTER;
        break;
      }
      case "ul":
      case "ol": {
        const items = el.querySelectorAll(":scope > li");
        const fontSize = 9;
        const lineHeight = lh(fontSize);

        for (let j = 0; j < items.length; j++) {
          const itemText = stripEmoji((items[j].textContent || "").trim());
          if (!itemText) continue;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(fontSize);

          const wrappedLines = doc.splitTextToSize(itemText, contentWidth - 8);
          const blockHeight = wrappedLines.length * lineHeight;

          ensureSpace(blockHeight);

          const bulletY = y - (lineHeight / 2) + 1.5;
          doc.setFillColor(100, 100, 100);
          doc.circle(MARGIN + 2.5, bulletY, 0.6, "F");

          doc.setTextColor(45, 45, 45);
          for (const line of wrappedLines) {
            doc.text(line, MARGIN + 7, y);
            y += lineHeight;
          }
          y += LINE_GAP * 0.5;
        }
        y += LINE_GAP;
        break;
      }
      case "p": {
        const strongEl = el.querySelector("strong");
        const isBoldOnly = strongEl && strongEl.textContent?.trim() === text;

        if (isBoldOnly) {
          renderTextBlock(text, 9.5, "bold", [30, 30, 30]);
        } else {
          renderTextBlock(text, 9, "normal", [55, 55, 55]);
        }
        y += LINE_GAP;
        break;
      }
      default: {
        renderTextBlock(text, 9, "normal", [65, 65, 65]);
        y += LINE_GAP;
      }
    }
  }
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `CounterSignal \u2022 Page ${p} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }
  doc.save(filename);
}
