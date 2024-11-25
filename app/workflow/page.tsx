'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Container, Table, Form, Button, Alert } from 'react-bootstrap'

export default function WorkflowPage() {
  interface File {
    id: number
    name: string
    status: string
  }

  const [fileList, setFileList] = useState<File[]>([])
  const [message, setMessage] = useState('')

  // Récupérer les fichiers avec leurs statuts depuis Supabase
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

  // Gérer la mise à jour des statuts
  const handleStatusChange = async (fileId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ status: newStatus })
        .eq('id', fileId)

      if (error) {
        throw error
      }

      setMessage('Statut mis à jour avec succès.')
      fetchFiles() // Rafraîchir la liste après mise à jour
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Erreur lors de la mise à jour du statut : ${error.message}`)
      } else {
        setMessage('Erreur inconnue lors de la mise à jour du statut.')
      }
    }
  }

  return (
    <Container>
      <h1 className="my-4">Gestion du Workflow</h1>
      {message && <Alert variant="info">{message}</Alert>}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Nom du fichier</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fileList.map((file, index) => (
            <tr key={index}>
              <td>{file.name}</td>
              <td>
                <Form.Select
                  value={file.status}
                  onChange={(e) => handleStatusChange(file.id, e.target.value)}
                >
                  <option value="À Faire">À Faire</option>
                  <option value="À Approuver">À Approuver</option>
                  <option value="À Traiter">À Traiter</option>
                  <option value="À Comptabiliser">À Comptabiliser</option>
                  <option value="À Payer">À Payer</option>
                  <option value="À Archiver">À Archiver</option>
                </Form.Select>
              </td>
              <td>
                <Button
                  variant="primary"
                  onClick={() => alert(`Action sur ${file.name}`)}
                >
                  Détails
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  )
}
