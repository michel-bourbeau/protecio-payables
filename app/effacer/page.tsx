'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { Container, ListGroup, Button, Alert } from 'react-bootstrap'

export default function DeletePage() {
  const [fileList, setFileList] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const handleSelectFile = (fileName: string) => {
    setSelectedFiles(
      (prevSelected) =>
        prevSelected.includes(fileName)
          ? prevSelected.filter((file) => file !== fileName) // Désélectionner
          : [...prevSelected, fileName] // Sélectionner
    )
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === fileList.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(fileList)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Veuillez sélectionner au moins un fichier à supprimer.')
      return
    }

    try {
      const { error } = await supabase.storage
        .from('pdf-files')
        .remove(selectedFiles)

      if (error) {
        throw error
      }

      setMessage('Les fichiers sélectionnés ont été supprimés avec succès.')
      setSelectedFiles([]) // Réinitialiser la sélection
      fetchFiles() // Rafraîchir la liste des fichiers
    } catch (error) {
      setMessage(`Erreur lors de la suppression : ${(error as Error).message}`)
    }
  }

  const fetchFiles = async () => {
    const { data, error } = await supabase.storage.from('pdf-files').list()

    if (error) {
      setMessage(`Erreur : ${error.message}`)
    } else {
      const filteredFiles =
        data?.filter((file) => file.name !== '.emptyFolderPlaceholder') || []
      setFileList(filteredFiles.map((file) => file.name))
    }
  }

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('pdf-files')
        .remove([fileName])

      if (error) {
        throw error
      }

      setMessage(`Le fichier "${fileName}" a été supprimé avec succès.`)
      fetchFiles() // Rafraîchir la liste après suppression
    } catch (error) {
      const errorMessage = (error as Error).message
      setMessage(`Erreur lors de la suppression : ${errorMessage}`)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  return (
    <Container>
      <h1 className="my-4">Supprimer des fichiers</h1>
      <Link href="/upload">
        <Button variant="link" className="mb-3">
          Aller à la page de téléchargement
        </Button>
      </Link>
      <Link href="/workflow">
        <Button variant="link" className="mb-3">
          Aller à la page de Workflow
        </Button>
      </Link>
      {message && <Alert variant="info">{message}</Alert>}
      <div className="mb-3">
        <input
          type="checkbox"
          className="form-check-input me-2"
          checked={
            selectedFiles.length === fileList.length && fileList.length > 0
          }
          onChange={handleSelectAll}
        />
        Sélectionner tout
      </div>
      <ListGroup>
        {fileList.map((file, index) => (
          <ListGroup.Item
            key={index}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={selectedFiles.includes(file)}
                onChange={() => handleSelectFile(file)}
              />
              {file}
            </div>
            <Button variant="danger" onClick={() => handleDelete(file)}>
              Supprimer
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
      <Button
        variant="danger"
        className="mt-3"
        onClick={handleDeleteSelected}
        disabled={selectedFiles.length === 0} // Désactiver si aucune sélection
      >
        Supprimer sélectionnés
      </Button>
    </Container>
  )
}
