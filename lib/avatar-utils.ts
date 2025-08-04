// Avatar generation utilities using Dicebear API
// https://www.dicebear.com/styles

export type AvatarStyle = 
  | 'adventurer'     // Cartoonish characters for users/staff
  | 'avataaars'      // More detailed cartoon avatars
  | 'big-ears'       // Cute big-eared characters
  | 'bottts'         // Robot avatars
  | 'croodles'       // Simple cartoon characters
  | 'fun-emoji'      // Emoji-style avatars
  | 'lorelei'        // Anime-style avatars
  | 'micah'          // Simple geometric characters
  | 'miniavs'        // Minimalist avatars
  | 'personas'       // Professional cartoon avatars for patients

export interface AvatarOptions {
  style?: AvatarStyle
  seed?: string
  backgroundColor?: string[]
  size?: number
}

// Generate a random seed for avatar generation
const generateRandomSeed = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export const generateAvatar = (name: string, options: AvatarOptions = {}) => {
  const {
    style = 'adventurer',
    seed = name.toLowerCase().replace(/\s+/g, ''),
    backgroundColor = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
    size = 120 // Bigger default size!
  } = options

  const baseUrl = `https://api.dicebear.com/7.x/${style}/svg`
  const params = new URLSearchParams({
    seed: encodeURIComponent(seed),
    backgroundColor: backgroundColor.join(','),
    size: size.toString()
  })

  return `${baseUrl}?${params.toString()}`
}

// Generate random avatar for new users/patients
export const generateRandomAvatar = (userType: 'user' | 'patient' = 'user') => {
  const randomSeed = generateRandomSeed()
  const style = userType === 'user' ? 'adventurer' : 'personas'
  
  return generateAvatar(randomSeed, { 
    style, 
    seed: randomSeed,
    size: 120 
  })
}

// Predefined avatar styles for different use cases
export const avatarStyles = {
  // For users/staff - fun and friendly
  cartoon: (name: string) => generateAvatar(name, { style: 'adventurer', size: 120 }),
  cute: (name: string) => generateAvatar(name, { style: 'big-ears', size: 120 }),
  simple: (name: string) => generateAvatar(name, { style: 'micah', size: 120 }),
  anime: (name: string) => generateAvatar(name, { style: 'lorelei', size: 120 }),
  robot: (name: string) => generateAvatar(name, { style: 'bottts', size: 120 }),
  emoji: (name: string) => generateAvatar(name, { style: 'fun-emoji', size: 120 }),
  
  // For patients - professional and trustworthy
  professional: (name: string) => generateAvatar(name, { style: 'personas', size: 120 }),
  patient: (name: string) => generateAvatar(name, { style: 'personas', size: 120 }),
}

// Default generators based on user type
export const generateCartoonAvatar = (name: string) => avatarStyles.cartoon(name)
export const generatePatientAvatar = (name: string) => avatarStyles.professional(name)

// Random avatar generators
export const generateRandomUserAvatar = () => generateRandomAvatar('user')
export const generateRandomPatientAvatar = () => generateRandomAvatar('patient') 