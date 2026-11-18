export function formatStudentId(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

export function isCompleteStudentId(value: string): boolean {
  return /^\d{8}$/.test(value)
}
