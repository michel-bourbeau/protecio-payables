'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  fetchFiles,
  deleteFile,
  deleteMultipleFiles,
} from '../modules/fileService'
import { Container, ListGroup, Button, Form } from 'react-bootstrap'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function DeletePage() {
  const [fileList, setFileList] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Pagination logic
  const paginatedFiles = fileList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSelectFile = (fileName: string) => {
    setSelectedFiles((prevSelected) =>
      prevSelected.includes(fileName)
        ? prevSelected.filter((file) => file !== fileName)
        : [...prevSelected, fileName]
    )
  }

  const handleSelectAll = () => {
    const allFilesSelected = selectedFiles.length === paginatedFiles.length
    setSelectedFiles(allFilesSelected ? [] : paginatedFiles)
  }

  const handleDelete = async (fileName: string) => {
    setLoading(true)
    try {
      await deleteFile(fileName)
      toast.success(`Fichier "${fileName}" supprimé avec succès.`)
      fetchFileList()
    } catch (error) {
      toast.error(`Erreur lors de la suppression : ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) {
      toast.info('Veuillez sélectionner au moins un fichier.')
      return
    }

    setLoading(true)
    try {
      await deleteMultipleFiles(selectedFiles)
      toast.success('Les fichiers sélectionnés ont été supprimés avec succès.')
      setSelectedFiles([])
      fetchFileList()
    } catch (error) {
      toast.error(`Erreur lors de la suppression : ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchFileList = async () => {
    setLoading(true)
    try {
      const files = await fetchFiles()
      setFileList(files)
    } catch (error) {
      toast.error(
        `Erreur lors de la récupération des fichiers : ${
          (error as Error).message
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFileList()
  }, [])

  return (
    <Container>
      <ToastContainer />
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
      {loading && (
        <div className="d-flex justify-content-center my-3">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      )}
      <div className="mb-3">
        <Form.Check
          type="checkbox"
          label="Sélectionner tout"
          checked={
            selectedFiles.length === paginatedFiles.length &&
            paginatedFiles.length > 0
          }
          onChange={handleSelectAll}
        />
      </div>
      <ListGroup>
        {paginatedFiles.map((file, index) => (
          <ListGroup.Item
            key={index}
            className="d-flex justify-content-between align-items-center"
          >
            <div className="d-flex align-items-center">
              <Form.Check
                type="checkbox"
                className="me-2"
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
      <div className="d-flex justify-content-between mt-3">
        <Button
          variant="outline-primary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Précédent
        </Button>
        <Button
          variant="outline-primary"
          disabled={currentPage === Math.ceil(fileList.length / itemsPerPage)}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Suivant
        </Button>
      </div>
      <Button
        variant="danger"
        className="mt-3"
        onClick={handleDeleteSelected}
        disabled={selectedFiles.length === 0}
      >
        Supprimer sélectionnés
      </Button>
    </Container>
  )
}
