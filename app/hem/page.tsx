import React from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity,
  Phone,
  Star,
  ArrowUp,
  Loader2,
  Search,
  Eye,
  Edit,
  RefreshCw,
  Target,
  Gauge,
  Download
} from 'lucide-react';

// Types
interface Message {
  id: string;
  content: string;
  created_at: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  patient_cnumber: string;
  recipient_phone: string;
  sender_tag: string;
  patient_name?: string;
  template_name?: string;
}

interface DashboardStats {
  totalMessages: number;
  sentToday: number;
  deliveryRate: number;
  activePatients: number;
  pendingMessages: number;
  failedMessages: number;
  avgResponseTime: string;
  topSender: string;
}

// Mock data
const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Påminnelse: Ditt läkarbesök är imorgon kl 14:00. Vänligen bekräfta.',
    created_at: '2025-08-03T10:30:00Z',
    status: 'delivered',
    patient_cnumber: 'C001',
    recipient_phone: '+46701234567',
    sender_tag: 'ANNA',
    patient_name: 'Erik Johansson',
    template_name: 'Appointment Reminder'
  },
  {
    id: '2',
    content: 'Hej! Dina provresultat är klara. Ring oss för att boka ett uppföljningsbesök.',
    created_at: '2025-08-03T09:15:00Z',
    status: 'sent',
    patient_cnumber: 'C002',
    recipient_phone: '+46709876543',
    sender_tag: 'MARTIN',
    patient_name: 'Maria Andersson',
    template_name: 'Test Results'
  },
  {
    id: '3',
    content: 'Tack för ditt besök idag. Ta medicinen enligt instruktion och kontakta oss vid frågor.',
    created_at: '2025-08-03T08:45:00Z',
    status: 'pending',
    patient_cnumber: 'C003',
    recipient_phone: '+46705555555',
    sender_tag: 'SARA',
    patient_name: 'Lars Nilsson'
  },
  {
    id: '4',
    content: 'Viktig information: Din medicinering har ändrats. Läs bifogad information noggrant.',
    created_at: '2025-08-02T16:20:00Z',
    status: 'failed',
    patient_cnumber: 'C004',
    recipient_phone: '+46701111111',
    sender_tag: 'ANNA',
    patient_name: 'Gunilla Svensson'
  },
  {
    id: '5',
    content: 'Månadsrapport: Din hälsostatus ser bra ut. Fortsätt enligt behandlingsplanen.',
    created_at: '2025-08-02T14:10:00Z',
    status: 'delivered',
    patient_cnumber: 'C005',
    recipient_phone: '+46702222222',
    sender_tag: 'MARTIN',
    patient_name: 'Astrid Holm'
  }
];

const mockStats: DashboardStats = {
  totalMessages: 1247,
  sentToday: 23,
  deliveryRate: 96.8,
  activePatients: 156,
  pendingMessages: 3,
  failedMessages: 12,
  avgResponseTime: '2.3s',
  topSender: 'ANNA'
};

// Utility functions
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Nu';
  if (diffMinutes < 60) return `${diffMinutes}m sedan`;
  if (diffHours < 24) return `${diffHours}h sedan`;
  if (diffDays < 7) return `${diffDays}d sedan`;
  return date.toLocaleDateString('sv-SE');
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'text-green-600 bg-green-100';
    case 'sent':
      return 'text-blue-600 bg-blue-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'sent':
      return <Send className="w-4 h-4" />;
    case 'pending':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

// Stat Card Component
const StatCard = ({
                    title,
                    value,
                    subtitle,
                    icon: Icon,
                    trend,
                    gradient = "from-blue-500 to-purple-600"
                  }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  gradient?: string;
}) => (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
              <div className="flex items-center gap-1 text-sm text-green-200">
                <ArrowUp className="w-4 h-4" />
                {trend}
              </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-3xl font-bold">{value}</h3>
          <p className="text-white/80 font-medium">{title}</p>
          {subtitle && <p className="text-white/60 text-sm">{subtitle}</p>}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-8 group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full transform -translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-500" />
    </div>
);

// Message Card Component
const MessageCard = ({ message }: { message: Message }) => (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            {message.sender_tag[0]}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">
              {message.patient_name || message.patient_cnumber}
            </h4>
            <p className="text-sm text-gray-500">{message.sender_tag}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(message.status)}`}>
          {getStatusIcon(message.status)}
          {message.status}
        </span>
        </div>
      </div>

      <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
        {message.content}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Phone className="w-4 h-4" />
            {message.recipient_phone}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatRelativeTime(message.created_at)}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          {message.status === 'failed' && (
              <button className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
          )}
        </div>
      </div>
    </div>
);

// Quick Send Component
const QuickSendWidget = () => (
    <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Snabbskicka SMS</h3>
          <p className="text-gray-600">Skicka meddelande direkt</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mottagare
          </label>
          <input
              type="text"
              placeholder="+46701234567 eller personnummer"
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meddelande
          </label>
          <textarea
              placeholder="Skriv ditt meddelande här..."
              rows={4}
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">0/160 tecken</span>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2">
          <Send className="w-5 h-5" />
          Skicka SMS
        </button>
      </div>
    </div>
);

// Main Dashboard Component - Server Side Only
export default function SMSDashboard() {
  const messages = mockMessages;
  const stats = mockStats;

  return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-4">
                  <div className="relative">
                    <MessageSquare className="w-12 h-12 text-purple-600" />
                  </div>
                  SMS Dashboard
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Din kommandocentral för SMS-kommunikation ✨
                </p>
              </div>

              <div className="flex gap-3">
                <button className="bg-white/70 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border border-gray-200/50">
                  <RefreshCw className="w-5 h-5" />
                  Uppdatera
                </button>

                <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Exportera
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Totalt meddelanden"
                value={stats.totalMessages.toLocaleString()}
                subtitle="Sedan lansering"
                icon={MessageSquare}
                trend="+12%"
                gradient="from-blue-500 to-cyan-500"
            />

            <StatCard
                title="Skickade idag"
                value={stats.sentToday}
                subtitle={`Medel: ${Math.round(stats.sentToday * 1.2)}/dag`}
                icon={Send}
                trend="+8%"
                gradient="from-green-500 to-emerald-500"
            />

            <StatCard
                title="Leveransgrad"
                value={`${stats.deliveryRate}%`}
                subtitle="Senaste 30 dagarna"
                icon={Target}
                trend="+2.1%"
                gradient="from-purple-500 to-violet-500"
            />

            <StatCard
                title="Aktiva patienter"
                value={stats.activePatients}
                subtitle="Kontaktade senaste månaden"
                icon={Users}
                trend="+15"
                gradient="from-pink-500 to-rose-500"
            />
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Väntande</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingMessages}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Misslyckade</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failedMessages}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Svarstid (snitt)</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Gauge className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Messages List */}
            <div className="lg:col-span-2 space-y-6">

              {/* Search and Filter - Static for Server Side */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Sök meddelanden, patienter, telefonnummer..."
                        className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-2">
                    {[
                      { key: 'all', label: 'Alla', color: 'bg-gray-600' },
                      { key: 'delivered', label: 'Levererade', color: 'bg-green-600' },
                      { key: 'sent', label: 'Skickade', color: 'bg-blue-600' },
                      { key: 'pending', label: 'Väntande', color: 'bg-yellow-600' },
                      { key: 'failed', label: 'Misslyckade', color: 'bg-red-600' }
                    ].map(({ key, label, color }, index) => (
                        <button
                            key={key}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                index === 0
                                    ? `${color} text-white shadow-lg`
                                    : 'bg-white/50 text-gray-600 hover:bg-white/80'
                            }`}
                        >
                          {label}
                        </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Messages Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  Senaste meddelanden
                </h2>
                <p className="text-gray-600">
                  Visar {messages.length} av {messages.length}
                </p>
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {messages.map((message) => (
                    <MessageCard
                        key={message.id}
                        message={message}
                    />
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* Quick Send */}
              <QuickSendWidget />

              {/* Top Senders */}
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Topp-avsändare</h3>
                    <p className="text-gray-600">Denna månad</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {['ANNA', 'MARTIN', 'SARA', 'ERIK'].map((sender, index) => (
                      <div key={sender} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {sender[0]}
                          </div>
                          <span className="font-medium text-gray-800">{sender}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">
                            {Math.floor(Math.random() * 100) + 50}
                          </p>
                          <p className="text-xs text-gray-500">meddelanden</p>
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Senaste aktivitet</h3>
                    <p className="text-gray-600">Live-uppdateringar</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-gray-700">SMS levererat till +46701234567</span>
                    <span className="text-gray-500 text-xs ml-auto">2m</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-gray-700">Nytt SMS skickat av ANNA</span>
                    <span className="text-gray-500 text-xs ml-auto">5m</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-gray-700">SMS väntar på leverans</span>
                    <span className="text-gray-500 text-xs ml-auto">8m</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-gray-700">Ny patient tillagd</span>
                    <span className="text-gray-500 text-xs ml-auto">12m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}