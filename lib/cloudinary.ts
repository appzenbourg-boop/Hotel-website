/**
 * Cloudinary Upload Utility
 * Uploads files directly to Cloudinary using unsigned upload preset.
 * Works on client-side (browser) only.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgadh7uwn'
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

export interface CloudinaryUploadResult {
    url: string
    publicId: string
    width: number
    height: number
    format: string
    bytes: number
}

/**
 * Upload a File object to Cloudinary.
 * @param file The file to upload
 * @param folder Optional subfolder in Cloudinary (e.g. 'menu', 'staff', 'lost-found')
 * @returns The secure URL and metadata
 */
export async function uploadToCloudinary(
    file: File,
    folder?: string
): Promise<CloudinaryUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    if (folder) {
        formData.append('folder', `zenbourg/${folder}`)
    }

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
    })

    if (!res.ok) {
        const error = await res.text()
        console.error('[CLOUDINARY_UPLOAD_ERROR]', error)
        throw new Error('Failed to upload image to Cloudinary')
    }

    const data = await res.json()

    return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format,
        bytes: data.bytes,
    }
}

/**
 * Upload a base64 data URL string to Cloudinary.
 * Converts it to a File first, then uploads.
 * @param dataUrl The base64 data URL (e.g. "data:image/jpeg;base64,...")
 * @param filename Optional filename
 * @param folder Optional Cloudinary subfolder
 */
export async function uploadBase64ToCloudinary(
    dataUrl: string,
    filename: string = 'upload.jpg',
    folder?: string
): Promise<CloudinaryUploadResult> {
    // If it's already a URL (not base64), return it as-is
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
        return {
            url: dataUrl,
            publicId: '',
            width: 0,
            height: 0,
            format: '',
            bytes: 0,
        }
    }

    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], filename, { type: blob.type })
    return uploadToCloudinary(file, folder)
}
