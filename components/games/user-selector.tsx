"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  UserPlus, 
  X, 
  Check,
  Loader2,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  display_name: string;
}

interface UserSelectorProps {
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  maxUsers?: number;
  className?: string;
}

export function UserSelector({ 
  selectedUsers, 
  onUsersChange, 
  maxUsers = 8,
  className 
}: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAllUsers = useCallback(async () => {
    setIsLoadingAll(true);
    try {
      console.log('🔄 Fetching all users...', { user: user?.id });
      
      const response = await fetch('/api/users/search?q=&limit=50'); // Empty query to get all users
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to see other users.",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Users data received:', data);
      console.log('👥 Number of users:', data.users?.length || 0);
      
      if (data.users && Array.isArray(data.users)) {
        setAllUsers(data.users);
        console.log('✅ Users set successfully:', data.users.length);
      } else {
        console.error('❌ Invalid users data format:', data);
        setAllUsers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching all users:', error);
      toast({
        title: "Loading Error",
        description: `Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAll(false);
    }
  }, [toast, user]);

  const searchUsers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Searching for:', query);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=20`);
      console.log('Search response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search error:', errorText);
        throw new Error(`Failed to search users: ${response.status}`);
      }

      const data = await response.json();
      console.log('Search results:', data);
      setSearchResults(data.users || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load all users on mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleUserSelect = (user: User) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      return; // Already selected
    }

    if (selectedUsers.length >= maxUsers) {
      toast({
        title: "Maximum Users Reached",
        description: `You can only invite up to ${maxUsers} users.`,
        variant: "destructive",
      });
      return;
    }

    onUsersChange([...selectedUsers, user]);
    setSearchQuery('');
    setShowResults(false);
    setShowDropdown(false);
  };

  const handleUserRemove = (userId: string) => {
    onUsersChange(selectedUsers.filter(u => u.id !== userId));
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setShowDropdown(true);
            }}
            onBlur={() => {
              // Delay hiding to allow clicks on user items
              setTimeout(() => setShowDropdown(false), 200);
            }}
            className="pl-10 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* User List (All Users or Search Results) */}
        <AnimatePresence>
          {showDropdown && ((!searchQuery.trim() && allUsers.length > 0 && !isLoadingAll) || (searchQuery.trim() && searchResults.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border rounded-lg shadow-lg"
            >
              <ScrollArea className="h-80">
                <div className="p-2">
                  {/* Header */}
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-gray-100 dark:border-gray-800">
                    {searchQuery.trim() ? `Search Results (${searchResults.length})` : `All Minato Users (${allUsers.length})`}
                  </div>
                  
                  {/* User List */}
                  {(searchQuery.trim() ? searchResults : allUsers).map((user) => {
                    const isSelected = selectedUsers.find(u => u.id === user.id);
                    return (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          isSelected 
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" 
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                        onClick={() => handleUserSelect(user)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {user.display_name}
                            </p>
                            {isSelected && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results */}
        {showDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border rounded-lg shadow-lg p-4"
          >
            <div className="text-center text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found matching "{searchQuery}"</p>
              <p className="text-xs mt-1">Try searching with a different name or email</p>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {showDropdown && isLoadingAll && !searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border rounded-lg shadow-lg p-4"
          >
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading Minato users...</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Selected Players ({selectedUsers.length}/{maxUsers})
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {user.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUserRemove(user.id)}
                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground">
        <p>💡 Browse all Minato users or search by name/email to invite them to your game</p>
        {selectedUsers.length > 0 && (
          <p className="mt-1">
            🎮 {selectedUsers.length} player{selectedUsers.length !== 1 ? 's' : ''} will receive an invitation when you create the game
          </p>
        )}
        {!user && (
          <p className="mt-1 text-red-600">
            🚫 Please log in to see other users.
          </p>
        )}
        {user && !isLoadingAll && allUsers.length === 0 && (
          <p className="mt-1 text-orange-600">
            ⚠️ No users found. Click the input field to load users.
          </p>
        )}

      </div>
    </div>
  );
} 