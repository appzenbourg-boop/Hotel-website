/**
 * Universal browser file download helper.
 * Fixes the issue in Chromium / Opera GX / Chrome / Edge where immediate URL.revokeObjectURL()
 * strips the filename and downloads files as raw blob UUIDs without extensions.
 */
export function downloadFile(
    content: Blob | string,
    filename: string,
    mimeType: string = 'text/csv;charset=utf-8;'
): void {
    if (typeof window === 'undefined') return

    let blob: Blob
    if (typeof content === 'string') {
        // Prepend UTF-8 BOM so Excel opens CSVs in proper columns with Hindi/special character support
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
        blob = new Blob([bom, content], { type: mimeType })
    } else {
        blob = content
    }

    // Ensure filename has the proper extension
    let cleanFilename = filename.trim()
    if (mimeType.includes('csv') && !cleanFilename.toLowerCase().endsWith('.csv')) {
        cleanFilename += '.csv'
    } else if (mimeType.includes('pdf') && !cleanFilename.toLowerCase().endsWith('.pdf')) {
        cleanFilename += '.pdf'
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.style.position = 'fixed'
    a.style.left = '-9999px'
    a.href = url
    a.download = cleanFilename
    a.setAttribute('download', cleanFilename)
    a.target = '_self'

    document.body.appendChild(a)
    a.click()

    // Retain object URL for 60 seconds so browser download manager resolves the filename properly
    setTimeout(() => {
        try {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {}
    }, 60000)
}

