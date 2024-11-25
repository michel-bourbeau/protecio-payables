'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { Container, Form, Button, Alert } from 'react-bootstrap'

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [message, setMessage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
  }

  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setMessage('Veuillez sélectionner au moins un fichier.')
      return
    }

    try {
      const totalFiles = files.length
      let uploadedFiles = 0

      const uploadPromises = Array.from(files).map(async (file) => {
        const { data, error } = await supabase.storage
          .from('pdf-files')
          .upload(file.name, file)

        if (error) {
          throw error
        }

        uploadedFiles += 1
        setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100))

        // Insérer le fichier dans la table `files`
        const { error: insertError } = await supabase.from('files').insert({
          name: file.name,
          status: 'À Faire', // Statut initial
        })

        if (insertError) {
          throw insertError
        }

        return data
      })

      await Promise.all(uploadPromises)

      setMessage('Tous les fichiers ont été téléchargés avec succès !')
      fetchFiles() // Rafraîchir la liste des fichiers
    } catch (error) {
      setMessage(`Erreur : ${(error as Error).message}`)
    }
  }

  const [fileList, setFileList] = useState<string[]>([])

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

  useEffect(() => {
    fetchFiles()
  }, [])

  return (
    <Container>
      <h1 className="my-4">Téléchargez vos factures</h1>
      <Link href="/effacer">
        <Button variant="link" className="mb-3">
          Aller à la page de suppression
        </Button>
      </Link>
      {message && <Alert variant="info">{message}</Alert>}
      {uploadProgress > 0 && (
        <div className="my-3">
          <p>Progression : {uploadProgress}%</p>
          <div className="progress">
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${uploadProgress}%` }}
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </div>
      )}
      <Form>
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Sélectionnez vos fichiers PDF</Form.Label>
          <Form.Control
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
          />
        </Form.Group>
        <Button variant="primary" onClick={handleUpload}>
          Télécharger
        </Button>
      </Form>
      <h2 className="my-4">Fichiers téléchargés</h2>
      <ul>
        {fileList.map((file, index) => (
          <li key={index}>{file}</li>
        ))}
      </ul>
    </Container>
  )
}
