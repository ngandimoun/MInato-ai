'use client'
import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, ChevronUp, ChevronDown, Loader2, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

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

export function UserSelector({ selectedUsers, onUsersChange, maxUsers = 8, className }: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/search?q=&limit=50');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching users:', errorText);
        
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to see other users.",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (user: User) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      onUsersChange(selectedUsers.filter(u => u.id !== user.id));
    } else if (selectedUsers.length < maxUsers) {
      onUsersChange([...selectedUsers, user]);
    }
  };

  const filteredUsers = users.filter((user: User) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollUp = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop -= 100;
      }
    }
  };

  const scrollDown = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop += 100;
      }
    }
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUsers.length === 0
              ? "Select users..."
              : `${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 max-h-[80vh] sm:max-h-64">
          <Command>
            <CommandInput 
              placeholder="Search users..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>No users found.</CommandEmpty>
            <div className="relative pr-12">
              <ScrollArea ref={scrollAreaRef} className="h-48 sm:h-64 max-h-[60vh] touch-pan-y">
                <CommandGroup className="touch-pan-y pr-2">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => toggleUser(user)}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedUsers.some(u => u.id === user.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              </ScrollArea>
              
              {/* Navigation buttons - only show when not loading and users are available */}
              {!loading && filteredUsers.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    onClick={scrollUp}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    onClick={scrollDown}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate">
                {user.name}
              </span>
              <button
                className="ml-1 rounded-full hover:bg-muted"
                onClick={() => toggleUser(user)}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
} 