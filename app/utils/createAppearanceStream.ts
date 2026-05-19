import { PDFPage, PDFContext, PDFDict, PDFName, PDFString } from 'pdf-lib'

/**
 * Creates a low-level Form XObject stream representing the visual aspect
 * of the sticky note, complete with bounded word wrapping.
 */
export const createAppearanceStream = (
  context: PDFContext,
  text: string,
  width: number,
  height: number,
  fontDict: PDFDict
) => {
  if (typeof width === 'undefined' || typeof height === 'undefined' || isNaN(width) || isNaN(height)) {
    console.error('CRITICAL: Invalid stream dimensions detected!', { width, height });
    // Return a dummy 1x1 stream to prevent the app from crashing while you debug
    width = 1; height = 1;
  }
  const words = text.split(' ')
  let currentLine = ''
  let textCommands = `BT\n/Helvetica 10 Tf\n0.2 0.2 0.2 rg\n6 ${(height - 14).toFixed(2)} Td\n14 TL\n`
  const maxCharsPerLine = Math.max(10, Math.floor(width / 5.5))

  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      textCommands += `(${currentLine.trim().replace(/[()]/g, '\\$&')}) Tj\nT*\n`
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  })
  if (currentLine) {
    textCommands += `(${currentLine.trim().replace(/[()]/g, '\\$&')}) Tj\n`
  }
  textCommands += 'ET'

  const rawStream = context.stream(
    `1 0.98 0.76 rg\n0 0 ${width.toFixed(2)} ${height.toFixed(2)} re\nf\n${textCommands}`
  )
  rawStream.dict.set(PDFName.of('Type'), PDFName.of('XObject'))
  rawStream.dict.set(PDFName.of('Subtype'), PDFName.of('Form'))
  rawStream.dict.set(PDFName.of('BBox'), context.obj([0, 0, width, height]))
  rawStream.dict.set(PDFName.of('Matrix'), context.obj([1, 0, 0, 1, 0, 0]))

  const apResources = PDFDict.withContext(context)
  apResources.set(PDFName.of('Font'), fontDict)
  rawStream.dict.set(PDFName.of('Resources'), apResources)

  return context.register(rawStream)
}
