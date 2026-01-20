import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Save, History, GitCompare, Play,
  Loader2, Edit2, Check, Clock
} from 'lucide-react'
import { Tabs, TabPanel } from '@/components/admin/Tabs'
import { FormField } from '@/components/admin/FormField'
import { Badge } from '@/components/admin/Badge'
import * as soulDocsApi from '@/lib/soulDocumentsApi'
import type { SoulDocument } from '@/types/admin'

export function SoulDocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [document, setDocument] = useState<SoulDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('editor')
  const [isSaving, setIsSaving] = useState(false)

  // Editor state
  const [editorContent, setEditorContent] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Diff view state
  const [diffVersion1, setDiffVersion1] = useState<string>('')
  const [diffVersion2, setDiffVersion2] = useState<string>('')


  useEffect(() => {
    if (id) loadDocument()
  }, [id])

  const loadDocument = async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await soulDocsApi.getSoulDocument(id)
      setDocument(data)
      // Set editor content to latest version or published version
      if (data?.versions && data.versions.length > 0) {
        const latestVersion = data.versions[0]
        setEditorContent(latestVersion.content)
        // Set diff defaults
        if (data.versions.length >= 2) {
          setDiffVersion1(data.versions[0].id)
          setDiffVersion2(data.versions[1].id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContentChange = (newContent: string) => {
    setEditorContent(newContent)
    const latestVersion = document?.versions?.[0]
    setHasUnsavedChanges(latestVersion?.content !== newContent)
  }

  const handleSaveVersion = async () => {
    if (!document) return

    setIsSaving(true)
    try {
      await soulDocsApi.createVersion(document.id, {
        content: editorContent,
        change_summary: changeSummary || undefined
      })
      setChangeSummary('')
      setHasUnsavedChanges(false)
      await loadDocument()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishVersion = async (versionId: string) => {
    try {
      await soulDocsApi.publishVersion(versionId)
      await loadDocument()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish version')
    }
  }

  const tabs = [
    { id: 'editor', label: 'Editor', icon: <Edit2 size={16} /> },
    { id: 'diff', label: 'Diff View', icon: <GitCompare size={16} /> },
    { id: 'versions', label: 'Versions', icon: <History size={16} /> },
    { id: 'tests', label: 'Tests', icon: <Play size={16} /> }
  ]

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        color: 'var(--color-text-secondary)'
      }}>
        <Loader2 size={48} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
        <p>Loading document...</p>
      </div>
    )
  }

  if (!document) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Document not found</h2>
        <Link to="/schema-admin/soul-documents">Back to Soul Documents</Link>
      </div>
    )
  }

  const publishedVersion = document.versions?.find(v => v.is_published)
  const latestVersion = document.versions?.[0]

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/schema-admin/soul-documents"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} />
          Back to Soul Documents
        </Link>
      </div>

      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <FileText size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{document.name}</h1>
              <Badge variant="info" size="sm">{document.doc_type.replace('_', ' ')}</Badge>
              {publishedVersion && <Badge variant="success" size="sm">v{publishedVersion.version}</Badge>}
            </div>
            {document.description && (
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                {document.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {hasUnsavedChanges && (
              <button onClick={handleSaveVersion} disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Version
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div style={{ padding: '24px' }}>
          {/* Editor Tab */}
          <TabPanel id="editor" activeTab={activeTab}>
            {hasUnsavedChanges && (
              <div style={{
                backgroundColor: 'var(--color-warning-light)',
                border: '1px solid #fcd34d',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#92400e'
              }}>
                <Clock size={18} />
                <span>You have unsaved changes</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Change summary (optional)"
                    className="input-field"
                    style={{ width: '250px', padding: '8px 12px', fontSize: '13px' }}
                  />
                  <button onClick={handleSaveVersion} disabled={isSaving} className="btn-primary" style={{ padding: '8px 16px' }}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save
                  </button>
                </div>
              </div>
            )}

            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: 'var(--color-surface-secondary)',
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Document Content (Markdown supported)</span>
                {latestVersion && (
                  <span>Last saved: v{latestVersion.version} by {latestVersion.changed_by}</span>
                )}
              </div>
              <textarea
                value={editorContent}
                onChange={(e) => handleContentChange(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '500px',
                  padding: '16px',
                  border: 'none',
                  resize: 'vertical',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  outline: 'none'
                }}
                placeholder="Enter your prompt content here..."
              />
            </div>
          </TabPanel>

          {/* Diff View Tab */}
          <TabPanel id="diff" activeTab={activeTab}>
            {document.versions && document.versions.length >= 2 ? (
              <>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <FormField label="Compare Version">
                    <select
                      value={diffVersion1}
                      onChange={(e) => setDiffVersion1(e.target.value)}
                      className="input-field"
                      style={{ padding: '10px 12px' }}
                    >
                      {document.versions.map(v => (
                        <option key={v.id} value={v.id}>
                          v{v.version} - {v.change_summary || 'No summary'} {v.is_published ? '(Published)' : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="With Version">
                    <select
                      value={diffVersion2}
                      onChange={(e) => setDiffVersion2(e.target.value)}
                      className="input-field"
                      style={{ padding: '10px 12px' }}
                    >
                      {document.versions.map(v => (
                        <option key={v.id} value={v.id}>
                          v{v.version} - {v.change_summary || 'No summary'} {v.is_published ? '(Published)' : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[diffVersion1, diffVersion2].map((versionId) => {
                    const version = document.versions?.find(v => v.id === versionId)
                    return (
                      <div key={versionId} style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          backgroundColor: 'var(--color-surface-secondary)',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 600 }}>Version {version?.version}</span>
                          {version?.is_published && <Badge variant="success" size="sm">Published</Badge>}
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: '16px',
                          fontSize: '13px',
                          lineHeight: 1.6,
                          overflow: 'auto',
                          maxHeight: '500px',
                          backgroundColor: 'var(--color-surface)',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {version?.content || 'Version not found'}
                        </pre>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                Need at least 2 versions to compare. Save more versions to use diff view.
              </p>
            )}
          </TabPanel>

          {/* Versions Tab */}
          <TabPanel id="versions" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Version History ({document.versions?.length || 0})</h3>
            </div>

            {document.versions && document.versions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {document.versions.map(version => (
                  <div
                    key={version.id}
                    style={{
                      backgroundColor: version.is_published ? 'var(--color-success-light)' : 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: `1px solid ${version.is_published ? '#86efac' : 'var(--color-border)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 600 }}>Version {version.version}</span>
                          {version.is_published && <Badge variant="success" size="sm">Published</Badge>}
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                          {version.change_summary || 'No change summary'}
                        </p>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          By {version.changed_by} • {new Date(version.created_at || '').toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setEditorContent(version.content)}
                          className="btn-secondary"
                          style={{ padding: '8px 12px' }}
                        >
                          View
                        </button>
                        {!version.is_published && (
                          <button
                            onClick={() => handlePublishVersion(version.id)}
                            className="btn-primary"
                            style={{ padding: '8px 12px' }}
                          >
                            <Check size={14} />
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No versions yet. Save your first version from the editor.
              </p>
            )}
          </TabPanel>

          {/* Tests Tab */}
          <TabPanel id="tests" activeTab={activeTab}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <Play size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
                Prompt Testing Coming Soon
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: '500px', lineHeight: 1.6 }}>
                Create test cases to validate your prompts against sample inputs.
                Compare outputs across versions and measure token usage and latency.
              </p>
              <div style={{
                marginTop: '24px',
                padding: '16px 20px',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                maxWidth: '400px'
              }}>
                <strong>Planned Features:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', textAlign: 'left' }}>
                  <li>Sample input/expected output test cases</li>
                  <li>A/B testing across prompt versions</li>
                  <li>Token usage and latency tracking</li>
                  <li>Automated regression testing</li>
                </ul>
              </div>
            </div>
          </TabPanel>
        </div>
      </div>

    </div>
  )
}
