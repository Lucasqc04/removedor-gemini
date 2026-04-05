import { useDropzone } from 'react-dropzone'

interface UploadAreaProps {
  onSelectFile: (file: File) => void
  disabled?: boolean
}

export function UploadArea({ onSelectFile, disabled = false }: UploadAreaProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    disabled,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    onDropAccepted(files) {
      const [file] = files
      if (file) {
        onSelectFile(file)
      }
    },
  })

  return (
    <div
      {...getRootProps()}
      className={`upload-zone ${isDragActive ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
    >
      <input {...getInputProps()} />
      <p className="upload-kicker">ARRASTE OU CLIQUE</p>
      <h2 className="upload-title">Imagem com marca d&apos;agua pequena</h2>
      <p className="upload-subtitle">
        Ideal para logos em canto. Formatos: PNG, JPG e WEBP.
      </p>
    </div>
  )
}
