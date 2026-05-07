export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") {
      closeList();
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList();
      html.push("<hr />");
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list items
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      const content = line.replace(/^[-*]\s+/, "");
      html.push(`<li>${inlineFormat(content)}</li>`);
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      // We treat ordered list items as unordered for simplicity in TipTap
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Table detection
    if (line.trim().startsWith("|")) {
      // Peek ahead to see if it's a table (check for separator line)
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith("|") && /^[|:-\s]+$/.test(nextLine.trim())) {
        closeList();
        html.push('<table style="width:100%; border-collapse: collapse; margin: 1rem 0;">');
        
        const getCells = (l: string) => {
          const cells = l.trim().split("|");
          // Remove first and last empty elements if they exist (from leading/trailing |)
          if (cells[0] === "") cells.shift();
          if (cells[cells.length - 1] === "") cells.pop();
          return cells.map(c => c.trim());
        };

        // Header
        const headers = getCells(line);
        html.push("<thead><tr>");
        headers.forEach(h => html.push(`<th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">${inlineFormat(h)}</th>`));
        html.push("</tr></thead>");
        
        // Skip separator line
        i++;
        
        // Body
        html.push("<tbody>");
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
          i++;
          const rowCells = getCells(lines[i]);
          html.push("<tr>");
          rowCells.forEach(c => html.push(`<td style="border: 1px solid #ddd; padding: 8px;">${inlineFormat(c)}</td>`));
          html.push("</tr>");
        }
        html.push("</tbody>");
        html.push("</table>");
        continue;
      }
    }

    // Regular paragraph
    closeList();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

/** Process inline formatting: bold, italic, code, links */
function inlineFormat(text: string): string {
  return (
    text
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Escaped pipes (from render.ts sanitizer)
      .replace(/\\\|/g, "|")
  );
}
