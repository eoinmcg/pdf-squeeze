const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE = ALPHABET.length

/**
 * Encodes a positive integer into a Base‑62 string.
 */
function encodeBase62(num: number): string {
  if (num <= 0) return '0'
  let encoded = ''
  while (num > 0) {
    encoded = ALPHABET[num % BASE] + encoded
    num = Math.floor(num / BASE)
  }
  return encoded
}

/**
 * Extracts the timestamp (as a JS number) from an ID like:
 *   <base62 timestamp>-<random>
 */
export function extractTimestamp(id: string): number {
  const [encodedTs] = id.split('-')
  return decodeBase62(encodedTs)
}

/**
 * Generates a short, sortable ID:
 *   <base62 timestamp>-<N random chars>
 *
 * @param randomLength Number of random Base‑62 characters to append.
 */
export function generateId(randomLength: number = 2, separator: string = '-'): string {
  const timestamp = encodeBase62(Date.now())

  let randomPart = ''
  for (let i = 0; i < randomLength; i++) {
    randomPart += ALPHABET[Math.floor(Math.random() * BASE)]
  }

  return `${timestamp}${separator}${randomPart}`
}

