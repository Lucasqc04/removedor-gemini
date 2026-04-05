export async function loadImageFromURL(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem.'))
    image.src = src
  })
}

export function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
}
