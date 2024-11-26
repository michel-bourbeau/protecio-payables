'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { Container, Form, Button, Alert, Table } from 'react-bootstrap'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FaDownload,
  FaArrowLeft,
  FaArrowRight,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa'

interface FileMetadata {
  name: string
  size: number
  createdAt: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [message, setMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [fileList, setFileList] = useState<FileMetadata[]>([]) // Inclut les métadonnées
  const [currentPage, setCurrentPage] = useState(1) // Page actuelle
  const itemsPerPage = 5 // Nombre d'éléments par page
  const [sortColumn, setSortColumn] = useState<keyof FileMetadata | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
  }

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

  const fetchFiles = async () => {
    const { data, error } = await supabase.storage.from('pdf-files').list()

    if (error) {
      setMessage(`Erreur : ${error.message}`)
    } else {
      const filteredFiles =
        data?.filter((file) => file.name !== '.emptyFolderPlaceholder') || []
      setFileList(
        filteredFiles.map((file) => ({
          name: file.name,
          size: file.metadata?.size || 0,
          createdAt: format(
            file.metadata?.created_at
              ? new Date(file.metadata.created_at)
              : new Date(),
            "'le' dd MMMM yyyy", // Format pour les Québécois
            { locale: fr } // Localisation française
          ),
        }))
      )
    }
  }

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('pdf-files')
        .download(fileName)

      if (error) {
        setMessage(`Erreur lors du téléchargement : ${error.message}`)
        return
      }

      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      setMessage(`Erreur : ${(error as Error).message}`)
    }
  }

  const handleSort = (column: keyof FileMetadata) => {
    if (sortColumn === column) {
      // Si on trie déjà cette colonne, inverser l'ordre
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      // Sinon, définir une nouvelle colonne
      setSortColumn(column)
      setSortOrder('asc')
    }
  }

  // Tri des fichiers
  const sortedFiles = [...fileList].sort((a, b) => {
    if (!sortColumn) return 0 // Pas de tri si aucune colonne sélectionnée
    const valueA = a[sortColumn]
    const valueB = b[sortColumn]

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA)
    }

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA
    }

    return 0
  })

  const paginatedFiles = sortedFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(fileList.length / itemsPerPage)

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
      <Link href="/workflow">
        <Button variant="link" className="mb-3">
          Aller à la page de Workflow
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
      <Table striped bordered hover>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>
              Nom du fichier{' '}
              {sortColumn === 'name' &&
                (sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th onClick={() => handleSort('size')}>
              Taille (octets){' '}
              {sortColumn === 'size' &&
                (sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th onClick={() => handleSort('createdAt')}>
              Date d&apos;ajout{' '}
              {sortColumn === 'createdAt' &&
                (sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedFiles.map((file, index) => (
            <tr key={index}>
              <td>{file.name}</td>
              <td>{file.size}</td>
              <td>{file.createdAt}</td>
              <td>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleDownload(file.name)}
                >
                  <FaDownload className="me-1" />
                  Télécharger
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="d-flex justify-content-between align-items-center mt-4">
        <Button
          variant="outline-primary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          <FaArrowLeft className="me-2" />
          Précédent
        </Button>
        <span>
          Page {currentPage} sur {totalPages}
        </span>
        <Button
          variant="outline-primary"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Suivant
          <FaArrowRight className="ms-2" />
        </Button>
      </div>
    </Container>
  )
}
