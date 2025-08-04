'use client'

import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'
import { AvatarStyleDemo } from '@/components/avatar-style-demo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function HistorikPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Realtime Avatar Stack
        </h1>
        <p className="text-muted-foreground text-lg">
          See who's currently online in different rooms with beautiful cartoonish avatar stacks
        </p>
      </div>

      {/* Avatar Style Demo */}
      <AvatarStyleDemo />

      {/* Different Sizes Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar Stack Sizes</CardTitle>
          <CardDescription>
            Different sizes for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Small (sm):</span>
            <RealtimeAvatarStack roomName="demo_small" size="sm" maxAvatarsAmount={3} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Medium (md):</span>
            <RealtimeAvatarStack roomName="demo_medium" size="md" maxAvatarsAmount={4} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Large (lg):</span>
            <RealtimeAvatarStack roomName="demo_large" size="lg" maxAvatarsAmount={5} />
          </div>
        </CardContent>
      </Card>

      {/* Chat Rooms Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* General Chat Room */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              General Chat
              <Badge variant="secondary" className="bg-green-100 text-green-800">Live</Badge>
            </CardTitle>
            <CardDescription>
              Main chat room for all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online users:</span>
              <RealtimeAvatarStack roomName="general_chat" maxAvatarsAmount={5} />
            </div>
          </CardContent>
        </Card>

        {/* Support Room */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Support Team
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Live</Badge>
            </CardTitle>
            <CardDescription>
              Customer support team room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online users:</span>
              <RealtimeAvatarStack roomName="support_team" maxAvatarsAmount={3} />
            </div>
          </CardContent>
        </Card>

        {/* Development Room */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Development
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">Live</Badge>
            </CardTitle>
            <CardDescription>
              Development team collaboration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online users:</span>
              <RealtimeAvatarStack roomName="development" maxAvatarsAmount={4} />
            </div>
          </CardContent>
        </Card>

        {/* Marketing Room */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Marketing
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">Live</Badge>
            </CardTitle>
            <CardDescription>
              Marketing team discussions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online users:</span>
              <RealtimeAvatarStack roomName="marketing" maxAvatarsAmount={6} />
            </div>
          </CardContent>
        </Card>

        {/* Sales Room */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Sales Team
              <Badge variant="secondary" className="bg-red-100 text-red-800">Live</Badge>
            </CardTitle>
            <CardDescription>
              Sales team coordination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online users:</span>
              <RealtimeAvatarStack roomName="sales_team" maxAvatarsAmount={4} />
            </div>
          </CardContent>
        </Card>

        {/* Break Room */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Break Room
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Live</Badge>
            </CardTitle>
            <CardDescription>
              Casual conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online users:</span>
              <RealtimeAvatarStack roomName="break_room" maxAvatarsAmount={8} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Documentation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            Features & Usage
          </CardTitle>
          <CardDescription>
            The RealtimeAvatarStack component shows who's currently online in real-time using Supabase's presence feature with beautiful cartoonish avatars.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3 text-lg">Features:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Real-time presence tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Beautiful cartoonish avatars with fallbacks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Configurable display limits and sizes
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Room-based isolation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Hover effects and smooth animations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  Multiple avatar styles available
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-lg">Usage:</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Basic usage:</p>
                  <pre className="text-xs bg-muted p-3 rounded border">
{`<RealtimeAvatarStack 
  roomName="general_chat" 
/>`}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">With options:</p>
                  <pre className="text-xs bg-muted p-3 rounded border">
{`<RealtimeAvatarStack 
  roomName="support_team"
  size="lg"
  maxAvatarsAmount={3}
  showTooltip={true}
/>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
