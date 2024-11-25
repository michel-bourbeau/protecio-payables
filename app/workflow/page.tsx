'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Container, Table, Form, Button, Alert } from 'react-bootstrap'
import { Modal } from 'react-bootstrap'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface File {
  id: number
  name: string
  status: string
}

export default function WorkflowPage() {
  const [fileList, setFileList] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [pendingChanges, setPendingChanges] = useState<
    { id: number; status: string }[]
  >([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const handleShowConfirmModal = () => setShowConfirmModal(true)
  const handleCloseConfirmModal = () => setShowConfirmModal(false)

  // Récupérer les fichiers depuis la table SQL
  const fetchFiles = async () => {
    const { data, error } = await supabase.from('files').select('*')

    if (error) {
      setMessage(`Erreur : ${error.message}`)
    } else {
      setFileList(data || [])
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

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

  return (
    <Container>
      <h1 className="my-4">Gestion du Workflow</h1>
      <ToastContainer />
      {message && <Alert variant="info">{message}</Alert>}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Nom du fichier</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {fileList.map((file, index) => {
            // Rechercher si un changement temporaire existe pour ce fichier
            const pendingChange = pendingChanges.find(
              (change) => change.id === file.id
            )
            return (
              <tr key={index} className={pendingChange ? 'modified-row' : ''}>
                <td>{file.name}</td>
                <td>
                  <Form.Select
                    value={pendingChange?.status || file.status}
                    onChange={(e) =>
                      handleSelectChange(file.id, e.target.value)
                    }
                  >
                    <option value="À Faire">À Faire</option>
                    <option value="À Approuver">À Approuver</option>
                    <option value="À Traiter">À Traiter</option>
                    <option value="À Comptabiliser">À Comptabiliser</option>
                    <option value="À Payer">À Payer</option>
                    <option value="À Archiver">À Archiver</option>
                  </Form.Select>
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
