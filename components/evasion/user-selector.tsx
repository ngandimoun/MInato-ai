'use client'
import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder="Search users..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading users...</div>
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