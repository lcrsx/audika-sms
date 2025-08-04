import { generatePatientAvatar } from '@/lib/avatar-utils'

export const usePatientAvatar = (patientName: string) => {
  // Generate professional avatar for patients
  return generatePatientAvatar(patientName)
}

// Hook for generating random patient avatar
export const useRandomPatientAvatar = () => {
  const { generateRandomPatientAvatar } = require('@/lib/avatar-utils')
  return generateRandomPatientAvatar()
} 