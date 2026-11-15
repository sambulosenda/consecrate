import createQr from 'qrcode-generator';

/** The link that opens the app on the join screen for a fast. */
export function joinLink(code: string): string {
  return `consecrate://join/${code}`;
}

/**
 * The QR code for a piece of text, as rows of cells (true is dark). Medium
 * error correction, so a code projected on a screen at the front of church
 * still scans from the back row.
 */
export function qrMatrix(text: string): boolean[][] {
  const qr = createQr(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => qr.isDark(row, col)),
  );
}
