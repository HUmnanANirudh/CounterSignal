"use client"

import { jsPDF } from "jspdf";
import { PDFOptions } from "@/types";

const LINE_SPACING = 1.5;
const LINE_GAP = 2;    
const BLOCK_GAP = 4;    
const SECTION_GAP = 7; 
const MARGIN = 20;
const PT_TO_MM = 0.3528;

const STATUS_COLORS: Record<string, [number, number, number]> = {
  "[OK]": [34, 197, 94],   // Green
  "[!]": [239, 68, 68],    // Red
  "[~]": [234, 179, 8],    // Yellow
  "[-]": [59, 130, 246],   // Blue
  "[WARN]": [249, 115, 22] // Orange
};

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
      const line = lines[i];
      let currentX = MARGIN + indent;

      // Split by any of the status tags
      const parts = line.split(/(\[OK\]|\[!\]|\[~\]|\[-\]|\[WARN\])/);

      for (const part of parts) {
        const color = STATUS_COLORS[part];
        if (color) {
          // Draw dot
          const dotY = y - (fontSize * PT_TO_MM * 0.35);
          doc.setFillColor(...color);
          doc.circle(currentX + 1.2, dotY, 0.8, "F");
          currentX += 4; // Space for the dot
        } else if (part) {
          // Regular text
          doc.text(part, currentX, y);
          currentX += doc.getTextWidth(part);
        }
      }
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

          // Check for status tag on first line
          const statusMatch = wrappedLines[0].match(/^(\[OK\]|\[!\]|\[~\]|\[-\]|\[WARN\])\s*(.*)/);
          let bulletColor: [number, number, number] = [100, 100, 100];
          
          if (statusMatch) {
            const tag = statusMatch[1];
            const color = STATUS_COLORS[tag];
            if (color) {
              bulletColor = color;
              wrappedLines[0] = statusMatch[2]; // Remove tag for display
            }
          }

          const bulletY = y - (lineHeight / 2) + 1.5;
          doc.setFillColor(...bulletColor);
          doc.circle(MARGIN + 2.5, bulletY, 0.8, "F");

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
      case "table": {
        const thead = el.querySelector("thead");
        const tbody = el.querySelector("tbody");
        const headerRows = thead ? Array.from(thead.querySelectorAll("tr")) : [];
        const bodyRows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
        const allRows = [...headerRows, ...bodyRows];

        if (allRows.length === 0) break;

        const colCount = allRows[0].querySelectorAll("th, td").length;
        const colWidth = contentWidth / colCount;
        const tableFontSize = 8;
        const tableLineHeight = lh(tableFontSize);
        
        y += BLOCK_GAP;

        for (let r = 0; r < allRows.length; r++) {
          const cells = Array.from(allRows[r].querySelectorAll("th, td"));
          
          // Calculate row height based on the tallest cell
          let maxCellLines = 1;
          const cellTextLines: string[][] = [];
          
          cells.forEach(cell => {
            const cellText = stripEmoji(cell.textContent || "");
            const lines = doc.splitTextToSize(cellText, colWidth - 4);
            cellTextLines.push(lines);
            if (lines.length > maxCellLines) maxCellLines = lines.length;
          });

          const rowHeight = (maxCellLines * tableLineHeight) + 4;
          ensureSpace(rowHeight);

          const cellYTop = y;

          // Draw cell borders and text
          for (let c = 0; c < cells.length; c++) {
            const cellX = MARGIN + c * colWidth;
            const isHeader = cells[c].tagName.toLowerCase() === "th";
            
            // Background for header
            if (isHeader) {
              doc.setFillColor(245, 245, 245);
              doc.rect(cellX, cellYTop, colWidth, rowHeight, "F");
              doc.setFont("helvetica", "bold");
            } else {
              doc.setFont("helvetica", "normal");
            }

            // Border
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.rect(cellX, cellYTop, colWidth, rowHeight, "S");

            // Text
            doc.setFontSize(tableFontSize);
            doc.setTextColor(40, 40, 40);
            const lines = cellTextLines[c];
            
            // Center text vertically in cell
            const textTotalHeight = lines.length * tableLineHeight;
            const startTextY = cellYTop + (rowHeight - textTotalHeight) / 2 + (tableFontSize * PT_TO_MM);

            for (let l = 0; l < lines.length; l++) {
              const line = lines[l];
              let currentX = cellX + 2;

              // Split by any of the status tags
              const parts = line.split(/(\[OK\]|\[!\]|\[~\]|\[-\]|\[WARN\])/);

              for (const part of parts) {
                const color = STATUS_COLORS[part];
                if (color) {
                  // Draw dot
                  const dotY = startTextY + (l * tableLineHeight) - (tableFontSize * PT_TO_MM * 0.35);
                  doc.setFillColor(...color);
                  doc.circle(currentX + 1.2, dotY, 0.8, "F");
                  currentX += 4; // Space for the dot
                } else if (part) {
                  // Regular text
                  doc.text(part, currentX, startTextY + (l * tableLineHeight));
                  currentX += doc.getTextWidth(part);
                }
              }
            }
          }
          y += rowHeight;
        }
        y += BLOCK_GAP;
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
