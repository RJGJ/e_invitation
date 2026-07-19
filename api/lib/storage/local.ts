import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { StorageDriver, UploadInput, UploadResult } from './types'

export interface LocalDriverConfig {
  dir: string
  publicUrl: string
}

export function createLocalDriver(config: LocalDriverConfig): StorageDriver {
  return {
    kind: 'local',
    async upload({ buffer, key }: UploadInput): Promise<UploadResult> {
      await mkdir(config.dir, { recursive: true })
      await writeFile(path.join(config.dir, key), buffer)

      const base = config.publicUrl.replace(/\/$/, '')
      return { key, url: `${base}/${key}` }
    },
  }
}
