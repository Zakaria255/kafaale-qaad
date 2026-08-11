/**
 * Opens a new browser window with the given HTML and triggers the print dialog.
 * Falls back to a downloadable .html file if popups are blocked.
 */
export function openPrintWindow(html, title = "Kafaala Qaad") {
  const win = window.open("", "_blank", "width=960,height=780,scrollbars=yes");
  if (!win) {
    // Popup blocked — offer download instead
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = title.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-") + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  const doPrint = () => {
    win.focus();
    win.print();
    win.onafterprint = () => { try { win.close(); } catch {} };
    setTimeout(() => { try { win.close(); } catch {} }, 15000);
  };
  if (win.document.readyState === "complete") {
    doPrint();
  } else {
    win.onload = doPrint;
  }
}
