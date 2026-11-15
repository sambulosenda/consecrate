import { View } from 'react-native';

import { qrMatrix } from '@/lib/join-link';
import { colors } from '@/theme';

/**
 * A QR code drawn with plain views, so it needs no native drawing library.
 * Dark cells in a row are merged into runs to keep the number of views low.
 */
export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const matrix = qrMatrix(value);
  // Whole pixels per cell, so the cells meet without hairline gaps.
  const cell = Math.max(1, Math.floor(size / matrix.length));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      // The white margin is part of the code: scanners need it.
      style={{ padding: cell * 4, backgroundColor: '#FFFFFF', alignSelf: 'center' }}>
      {matrix.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', height: cell }}>
          {runs(row).map((run, i) => (
            <View
              key={i}
              style={{
                width: run.length * cell,
                height: cell,
                backgroundColor: run.dark ? colors.ink : '#FFFFFF',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function runs(row: readonly boolean[]): { dark: boolean; length: number }[] {
  const out: { dark: boolean; length: number }[] = [];
  for (const dark of row) {
    const last = out[out.length - 1];
    if (last && last.dark === dark) last.length += 1;
    else out.push({ dark, length: 1 });
  }
  return out;
}
