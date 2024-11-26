'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import {
  Container,
  Table,
  Form,
  Button,
  Alert,
  Badge,
  ProgressBar,
} from 'react-bootstrap'
import { Modal } from 'react-bootstrap'
import { ToastContainer, toast } from 'react-toastify'
import { FaSortUp, FaSortDown, FaTrash } from 'react-icons/fa'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-toastify/dist/ReactToastify.css'

interface File {
  id: number
  name: string
  status: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  'À Faire': 'secondary',
  'À Approuver': 'info',
  'À Traiter': 'primary',
  'À Comptabiliser': 'warning',
  'À Payer': 'danger',
  'À Archiver': 'success',
}

const statusProgress: Record<string, number> = {
  'À Faire': 0,
  'À Approuver': 20,
  'À Traiter': 40,
  'À Comptabiliser': 60,
  'À Payer': 80,
  'À Archiver': 100,
}

const handleDownloadFile = async (fileName: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('pdf-files')
      .download(fileName)
    if (error) {
      toast.error(`Erreur lors du téléchargement : ${error.message}`)
      return
    }

    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Fichier "${fileName}" téléchargé avec succès.`)
  } catch (error) {
    toast.error(`Erreur lors du téléchargement. [error: ${error}]`)
  }
}

export default function WorkflowPage() {
  const [fileList, setFileList] = useState<File[]>([])
  const [filteredFiles, setFilteredFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pendingChanges, setPendingChanges] = useState<
    { id: number; status: string }[]
  >([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [sortColumn, setSortColumn] = useState<keyof File | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleShowConfirmModal = () => setShowConfirmModal(true)
  const handleCloseConfirmModal = () => setShowConfirmModal(false)

  // Récupérer les fichiers depuis la table SQL
  const fetchFiles = async () => {
    const { data, error } = await supabase.from('files').select('*')

    if (error) {
      setMessage(`Erreur : ${error.message}`)
    } else {
      const formattedData = data?.map((file) => ({
        ...file,
        createdAt: file.createdAt
          ? format(new Date(file.createdAt), "'le' dd MMMM yyyy", {
              locale: fr,
            })
          : 'Date inconnue',
      }))
      setFileList(formattedData || [])
      setFilteredFiles(formattedData || [])
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  // Filtrer les fichiers en fonction de la recherche et des statuts
  useEffect(() => {
    let filtered = fileList

    if (searchTerm) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((file) => file.status === statusFilter)
    }

    setFilteredFiles(filtered)
  }, [searchTerm, statusFilter, fileList])

  // Enregistrer les changements temporaires
  const handleSelectChange = (fileId: number, newStatus: string) => {
    setPendingChanges((prev) => {
      const existingChange = prev.find((change) => change.id === fileId)
      if (existingChange) {
        return prev.map((change) =>
          change.id === fileId ? { ...change, status: newStatus } : change
        )
      }
      return [...prev, { id: fileId, status: newStatus }]
    })
  }

  // Sauvegarder tous les changements
  const handleSaveChanges = async () => {
    try {
      const updatePromises = pendingChanges.map((change) =>
        supabase
          .from('files')
          .update({ status: change.status })
          .eq('id', change.id)
      )

      await Promise.all(updatePromises)

      toast.success('Tous les changements ont été sauvegardés avec succès.')
      setPendingChanges([])
      fetchFiles()
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Erreur lors de la sauvegarde : ${error.message}`)
      } else {
        toast.error('Erreur inconnue lors de la sauvegarde.')
      }
    }
  }

  // Annuler tous les changements en attente
  const handleCancelChanges = () => {
    setPendingChanges([])
  }

  // Supprimer un fichier
  const handleDeleteFile = async (fileId: number, fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('pdf-files')
        .remove([fileName])
      if (error) {
        toast.error(`Erreur lors de la suppression : ${error.message}`)
        return
      }
      await supabase.from('files').delete().eq('id', fileId)
      toast.success('Fichier supprimé avec succès.')
      fetchFiles()
    } catch (error) {
      toast.error(`Erreur lors de la suppression. (${error})`)
    }
  }

  // Gestion du tri
  const handleSort = (column: keyof File) => {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
  }

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (!sortColumn) return 0
    const valueA = a[sortColumn]
    const valueB = b[sortColumn]

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA)
    }

    return 0
  })

  const synchronizeFiles = async () => {
    try {
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('pdf-files')
        .list()

      if (storageError) {
        toast.error(`Erreur bucket : ${storageError.message}`)
        return
      }

      const filteredStorageFiles = storageFiles?.filter(
        (file) => file.name !== '.emptyFolderPlaceholder'
      )
      const { data: tableFiles, error: tableError } = await supabase
        .from('files')
        .select('id, name')

      if (tableError) {
        toast.error(`Erreur table : ${tableError.message}`)
        return
      }

      const storageFileNames =
        filteredStorageFiles?.map((file) => file.name) || []
      const tableFileNames = tableFiles?.map((file) => file.name) || []
      const missingInTable = storageFileNames.filter(
        (fileName) => !tableFileNames.includes(fileName)
      )

      const addPromises = missingInTable.map((fileName) =>
        supabase.from('files').insert({
          name: fileName,
          status: 'À Faire',
        })
      )

      await Promise.all(addPromises)

      const missingInStorage = tableFiles?.filter(
        (file) => !storageFileNames.includes(file.name)
      )

      const deletePromises = missingInStorage?.map((file) =>
        supabase.from('files').delete().eq('id', file.id)
      )

      await Promise.all(deletePromises)

      toast.success('Synchronisation terminée avec succès !')
      fetchFiles()
    } catch (error) {
      toast.error(`Erreur synchronisation. error: [${error}]`)
    }
  }

  useEffect(() => {
    const syncAndFetch = async () => {
      await synchronizeFiles()
      fetchFiles()
    }
    syncAndFetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container>
      <h1 className="my-4">Gestion du Workflow</h1>
      <Link href="/upload">
        <Button variant="link" className="mb-3">
          Aller à la page de téléchargement
        </Button>
      </Link>
      <Link href="/effacer">
        <Button variant="link" className="mb-3">
          Aller à la page de Suppression
        </Button>
      </Link>
      <ToastContainer />
      {message && <Alert variant="info">{message}</Alert>}

      <div className="d-flex justify-content-between mb-4">
        <Form.Control
          type="text"
          placeholder="Rechercher un fichier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="me-2"
        />
        <Form.Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="me-2"
        >
          <option value="">Tous les statuts</option>
          {Object.keys(statusColors).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Form.Select>
      </div>
      <Button variant="info" className="mb-3" onClick={synchronizeFiles}>
        Synchroniser les fichiers
      </Button>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>
              Nom{' '}
              {sortColumn === 'name' &&
                (sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />)}
            </th>
            <th>Status</th>
            <th>Date d&apos;ajout</th>
            <th>Progression</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedFiles.map((file) => {
            const pendingChange = pendingChanges.find(
              (change) => change.id === file.id
            )
            return (
              <tr key={file.id}>
                <td>{file.name}</td>
                <td>
                  <Form.Select
                    value={pendingChange?.status || file.status}
                    onChange={(e) =>
                      handleSelectChange(file.id, e.target.value)
                    }
                  >
                    {Object.keys(statusColors).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Form.Select>
                  <Badge bg={statusColors[file.status]} className="mt-2">
                    {file.status}
                  </Badge>
                </td>
                <td>{file.createdAt}</td>
                <td>
                  <ProgressBar
                    now={statusProgress[file.status]}
                    label={`${statusProgress[file.status]}%`}
                  />
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleDownloadFile(file.name)}
                    className="me-2"
                  >
                    Télécharger
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id, file.name)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between mt-3">
        <Button
          variant="success"
          onClick={handleShowConfirmModal}
          disabled={pendingChanges.length === 0}
        >
          Sauvegarder les changements
        </Button>
        <Button
          variant="warning"
          onClick={handleCancelChanges}
          disabled={pendingChanges.length === 0}
        >
          Annuler les changements
        </Button>
      </div>
      <Modal show={showConfirmModal} onHide={handleCloseConfirmModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer les changements</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Êtes-vous sûr de vouloir sauvegarder les changements de statut ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseConfirmModal}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              handleSaveChanges()
              handleCloseConfirmModal()
            }}
          >
            Confirmer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
