import { supabase } from '@/lib/supabaseClient'

export const fetchFiles = async (): Promise<string[]> => {
  const { data, error } = await supabase.storage.from('pdf-files').list()

  if (error) {
    console.error('Erreur lors de la récupération des fichiers :', error)
    throw error
  }

  return (
    data
      ?.filter((file) => file.name !== '.emptyFolderPlaceholder')
      .map((file) => file.name) || []
  )
}

export const deleteFile = async (fileName: string): Promise<void> => {
  const { error } = await supabase.storage.from('pdf-files').remove([fileName])

  if (error) {
    console.error(
      `Erreur lors de la suppression du fichier ${fileName}:`,
      error
    )
    throw error
  }
}

export const deleteMultipleFiles = async (
  fileNames: string[]
): Promise<void> => {
  const { error } = await supabase.storage.from('pdf-files').remove(fileNames)

  if (error) {
    console.error('Erreur lors de la suppression multiple :', error)
    throw error
  }
}
