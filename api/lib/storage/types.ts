export interface UploadInput {
  buffer: Buffer
  key: string
  mimeType: string
}

export interface UploadResult {
  key: string
  url: string
}

export interface StorageDriver {
  kind: 'local' | 's3' | 'gcs'
  upload(input: UploadInput): Promise<UploadResult>
}
