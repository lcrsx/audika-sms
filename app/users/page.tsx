'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedSearch } from '@/lib/hooks/use-debounced-search';
import { usePagination, paginateArray } from '@/lib/hooks/use-pagination';
import { EnhancedPagination } from '@/components/enhanced-pagination';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
  Users,
  Search,
  MessageSquare,
  User,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

// User data interface
interface UserData {
  username: string;
  source: 'chat' | 'sms';
  messageCount: number;
  lastActivity?: string;
  isActive?: boolean;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  
  // Debounced search
  const { debouncedSearchTerm } = useDebouncedSearch(searchQuery, 300);

  // Fetch users from available sources
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userMap = new Map<string, UserData>();
      
      // Get users from chat messages
      const { data: chatUsers, error: chatError } = await supabase
        .from('chat')
        .select('username, created_at')
        .order('created_at', { ascending: false });
        
      if (chatError) throw chatError;
      
      chatUsers?.forEach(msg => {
        if (msg.username && msg.username !== 'SYSTEM') {
          const existing = userMap.get(msg.username);
          if (!existing || new Date(msg.created_at) > new Date(existing.lastActivity || '')) {
            userMap.set(msg.username, {
              username: msg.username,
              source: 'chat',
              messageCount: (existing?.messageCount || 0) + 1,
              lastActivity: msg.created_at,
              isActive: true
            });
          } else if (existing) {
            existing.messageCount++;
          }
        }
      });
      
      // Get users from SMS messages
      const { data: smsUsers, error: smsError } = await supabase
        .from('messages')
        .select('sender_tag, created_at')
        .not('sender_tag', 'is', null)
        .order('created_at', { ascending: false });
        
      if (smsError) throw smsError;
      
      smsUsers?.forEach(msg => {
        if (msg.sender_tag && msg.sender_tag !== 'SYSTEM') {
          const existing = userMap.get(msg.sender_tag);
          if (!existing) {
            userMap.set(msg.sender_tag, {
              username: msg.sender_tag,
              source: 'sms',
              messageCount: 1,
              lastActivity: msg.created_at,
              isActive: true
            });
          } else if (existing.source === 'sms') {
            existing.messageCount++;
            if (new Date(msg.created_at) > new Date(existing.lastActivity || '')) {
              existing.lastActivity = msg.created_at;
            }
          }
        }
      });
      
      // Convert to array and sort by activity
      const userList = Array.from(userMap.values())
        .sort((a, b) => {
          // Sort by last activity date
          const dateA = new Date(a.lastActivity || 0);
          const dateB = new Date(b.lastActivity || 0);
          return dateB.getTime() - dateA.getTime();
        });
      
      setUsers(userList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Det gick inte att hämta användare');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  // Pagination
  const pagination = usePagination({ 
    pageSize: 20,
    totalItems: filteredUsers.length 
  });

  // Paginate results
  const paginatedUsers = paginateArray(filteredUsers, pagination.currentPage, pagination.pageSize);

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Användare
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sök och hitta användare i systemet
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Sök efter användarnamn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <Search className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Inga användare hittades' : 'Inga användare tillgängliga'}
          </p>
        </div>
      ) : (
        <>
          {/* User List */}
          <div className="space-y-4 mb-6">
            <AnimatePresence mode="popLayout">
              {paginatedUsers.map((user, index) => (
                <motion.div
                  key={user.username}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* User Info */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {user.username}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <Badge variant={user.source === 'chat' ? 'default' : 'secondary'} className="text-xs">
                              {user.source === 'chat' ? 'Chat' : 'SMS'} användare
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MessageSquare className="w-3 h-3" />
                              <span>{user.messageCount} meddelanden</span>
                            </div>
                            {user.lastActivity && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{formatRelativeTime(user.lastActivity)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link href={`/${user.username}`}>
                          <Button variant="outline" size="sm">
                            <User className="w-4 h-4 mr-2" />
                            Visa profil
                          </Button>
                        </Link>
                        <Link href={`/chat?dm=${user.username}`}>
                          <Button variant="default" size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chatta
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <EnhancedPagination
              pagination={pagination}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </>
      )}
    </div>
  );
}