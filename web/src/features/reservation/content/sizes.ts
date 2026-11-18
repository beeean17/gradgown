import type { GownSizeSpec } from '../../../shared/types'

/**
 * The counter's three gown sizes with measured dimensions (cm), in rack order.
 * Static reference copy: the stored reservation only records the letter.
 */
export const GOWN_SIZE_CHART: GownSizeSpec[] = [
  { size: 'S', lengthLabel: '107 cm', totalLengthCm: 107, chestWidthCm: 50, shoulderWidthCm: 20, sleeveLengthCm: 50 },
  { size: 'M', lengthLabel: '113 cm', totalLengthCm: 113, chestWidthCm: 50, shoulderWidthCm: 20, sleeveLengthCm: 54 },
  { size: 'L', lengthLabel: '117 cm', totalLengthCm: 117, chestWidthCm: 52, shoulderWidthCm: 20, sleeveLengthCm: 60 },
]
