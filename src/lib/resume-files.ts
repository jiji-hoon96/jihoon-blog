import { statSync } from 'node:fs'
import path from 'node:path'

/**
 * 공개 이력서 PDF.
 *
 * 크기를 손으로 적지 않고 빌드 때 잰다. 적어 두면 파일을 갈아 끼울 때 표시만 남아
 * 어긋난다. 한국어본이 1.9MB 라 사람이 누르기 전에 알 수 있게 화면에 띄운다.
 */
type ResumeFile = {
  locale: 'ko' | 'en'
  path: string
  size: string
}

const FILES: ReadonlyArray<Omit<ResumeFile, 'size'>> = [
  { locale: 'ko', path: '/resume/jihoon-lee-resume-ko.pdf' },
  { locale: 'en', path: '/resume/jihoon-lee-resume-en.pdf' },
]

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.round(bytes / 1024)}KB`
}

export const RESUME_FILES: ReadonlyArray<ResumeFile> = FILES.map(file => ({
  ...file,
  size: formatFileSize(statSync(path.join(process.cwd(), 'public', file.path)).size),
}))
