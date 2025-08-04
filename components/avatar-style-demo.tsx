'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { avatarStyles } from '@/lib/avatar-utils'

const demoUsers = [
  'Alice Johnson',
  'Bob Smith',
  'Carol Davis',
  'David Wilson',
  'Emma Brown'
]

const demoPatients = [
  'Maria Andersson',
  'Johan Nilsson',
  'Anna Lindberg',
  'Erik Svensson',
  'Karin Bergman'
]

export function AvatarStyleDemo() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Avatar Strategy
        </h2>
        <p className="text-muted-foreground text-lg">
          Different avatar styles for users vs patients
        </p>
      </div>

      {/* User Avatars Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">👥 Staff/Users - Fun & Friendly</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Cartoon Style for Users */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Cartoon (Adventurer)
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Default for Users</Badge>
              </CardTitle>
              <CardDescription>
                Fun cartoonish characters for staff members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoUsers.map((user, index) => (
                  <Avatar key={index} className="h-10 w-10">
                    <AvatarImage src={avatarStyles.cartoon(user)} alt={user} />
                    <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cute Style */}
          <Card>
            <CardHeader>
              <CardTitle>Cute (Big Ears)</CardTitle>
              <CardDescription>
                Adorable big-eared characters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoUsers.map((user, index) => (
                  <Avatar key={index} className="h-10 w-10">
                    <AvatarImage src={avatarStyles.cute(user)} alt={user} />
                    <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Anime Style */}
          <Card>
            <CardHeader>
              <CardTitle>Anime (Lorelei)</CardTitle>
              <CardDescription>
                Anime-style avatars
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoUsers.map((user, index) => (
                  <Avatar key={index} className="h-10 w-10">
                    <AvatarImage src={avatarStyles.anime(user)} alt={user} />
                    <AvatarFallback>{user.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Patient Avatars Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">🏥 Patients - Professional & Trustworthy</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Professional Style for Patients */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Professional (Personas)
                <Badge variant="secondary" className="bg-green-100 text-green-800">Default for Patients</Badge>
              </CardTitle>
              <CardDescription>
                Professional cartoon avatars for patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoPatients.map((patient, index) => (
                  <Avatar key={index} className="h-10 w-10">
                    <AvatarImage src={avatarStyles.professional(patient)} alt={patient} />
                    <AvatarFallback>{patient.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Simple Style */}
          <Card>
            <CardHeader>
              <CardTitle>Simple (Micah)</CardTitle>
              <CardDescription>
                Minimalist geometric characters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoPatients.map((patient, index) => (
                  <Avatar key={index} className="h-10 w-10">
                    <AvatarImage src={avatarStyles.simple(patient)} alt={patient} />
                    <AvatarFallback>{patient.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Robot Style */}
          <Card>
            <CardHeader>
              <CardTitle>Robot (Bottts)</CardTitle>
              <CardDescription>
                Robot avatars
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoPatients.map((patient, index) => (
                  <Avatar key={index} className="h-10 w-10">
                    <AvatarImage src={avatarStyles.robot(patient)} alt={patient} />
                    <AvatarFallback>{patient.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            Avatar Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">For Users (Staff):</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Cartoon (Adventurer) - Fun and friendly</li>
                <li>• Random avatar generation on first login</li>
                <li>• Avatar refresh button on profile page</li>
                <li>• Bigger avatars (120px) by default</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">For Patients:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Professional (Personas) - Trustworthy</li>
                <li>• Random avatar generation on first contact</li>
                <li>• Consistent avatars based on patient name</li>
                <li>• Professional appearance for medical context</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 