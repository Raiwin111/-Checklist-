import { supabase } from '../supabase'
import type { TaskImage } from '../../types/database'
import { tr } from '../messages'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export type TaskImageWithUrl = TaskImage & {
  signedUrl: string | null
}

type CompressedImage = {
  blob: Blob
  width: number
  height: number
  mimeType: string
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(tr('error.notImage'))
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(tr('error.imageTooLarge'))
  }

  const bitmap = await createImageBitmap(file)
  const maxDimension = 1920
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error(tr('error.imageUnsupported'))
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error(tr('error.imageCompress')))
      },
      'image/webp',
      0.82,
    )
  })

  return {
    blob,
    width,
    height,
    mimeType: blob.type || 'image/webp',
  }
}

export async function uploadTaskImage(
  userId: string,
  taskId: string,
  file: File,
): Promise<TaskImage> {
  const compressed = await compressImage(file)
  const id = crypto.randomUUID()
  const extension =
    compressed.mimeType === 'image/webp'
      ? 'webp'
      : compressed.mimeType === 'image/png'
        ? 'png'
        : 'jpg'
  const storagePath = `${userId}/${taskId}/${id}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('task-images')
    .upload(storagePath, compressed.blob, {
      contentType: compressed.mimeType,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('task_images')
    .insert({
      id,
      task_id: taskId,
      user_id: userId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: compressed.mimeType,
      size_bytes: compressed.blob.size,
      width: compressed.width,
      height: compressed.height,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from('task-images').remove([storagePath])
    throw error
  }

  return data as TaskImage
}

export async function deleteTaskImage(image: TaskImage): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('task-images')
    .remove([image.storage_path])

  if (storageError) throw storageError

  const { error } = await supabase
    .from('task_images')
    .delete()
    .eq('id', image.id)

  if (error) throw error
}

export async function attachSignedUrls(
  images: TaskImage[],
): Promise<TaskImageWithUrl[]> {
  return Promise.all(
    images.map(async (image) => {
      const { data, error } = await supabase.storage
        .from('task-images')
        .createSignedUrl(image.storage_path, 60 * 60)

      return {
        ...image,
        signedUrl: error ? null : (data?.signedUrl ?? null),
      }
    }),
  )
}
