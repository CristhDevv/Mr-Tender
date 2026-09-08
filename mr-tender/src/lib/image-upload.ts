/**
 * Product Image Upload Helper
 * Uploads images to Supabase storage 'products' bucket with automatic Base64 DataURL fallback
 */

export async function uploadProductImage(
  file: File,
  tenantId: string,
  supabase: any
): Promise<string> {
  if (!file) return ''

  try {
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${tenantId || 'global'}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

    const { data, error } = await supabase.storage.from('products').upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(fileName)
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload failed, falling back to base64 DataURL:', err)
  }

  // Graceful fallback to client-side Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
