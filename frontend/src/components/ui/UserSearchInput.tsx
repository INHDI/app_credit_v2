"use client";

import { useState, useEffect, useRef } from "react";
import { Search, User as UserIcon, Loader2, X } from "lucide-react";
import { AuthApi, User } from "@/services/authApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserSearchInputProps {
    onSelect: (user: User | null) => void;
    selectedUser?: User | null;
    placeholder?: string;
    className?: string;
}

export default function UserSearchInput({
    onSelect,
    selectedUser,
    placeholder = "Tìm kiếm người vay...",
    className,
}: UserSearchInputProps) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 1) {
                setLoading(true);
                try {
                    // We fetch all users and filter client-side for now as the API might not support search query directly
                    // Optimization: If API supports search, pass query here.
                    // Based on users/page.tsx, it seems we fetch all.
                    const allUsers = await AuthApi.getUsers();

                    // Filter: Must be 'debtor' AND match query
                    const filtered = allUsers.filter(u =>
                        (u.role === 'debtor' || !u.role) && // Assuming default role or 'debtor'
                        (u.ho_ten.toLowerCase().includes(query.toLowerCase()) ||
                            u.email.toLowerCase().includes(query.toLowerCase()) ||
                            u.so_dien_thoai.includes(query))
                    );
                    setUsers(filtered.slice(0, 5)); // Limit to 5 results
                    setIsOpen(true);
                } catch (error) {
                    console.error("Error searching users:", error);
                    setUsers([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setUsers([]);
                setIsOpen(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (user: User) => {
        onSelect(user);
        setQuery("");
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setQuery("");
    };

    if (selectedUser) {
        return (
            <div className={`relative flex items-center p-3 border rounded-xl bg-blue-50 border-blue-200 ${className}`}>
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
                        <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm text-blue-900 truncate">{selectedUser.ho_ten}</span>
                        <span className="text-xs text-blue-700/80 truncate font-medium">{selectedUser.so_dien_thoai}</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-8 w-8 p-0 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (users.length > 0) setIsOpen(true);
                    }}
                    className="pl-9 pr-4 rounded-xl"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && users.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl ring-1 ring-slate-900/5 z-[100] overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-2 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-50 sticky top-0 backdrop-blur-sm">
                        Khách hàng
                    </div>
                    {users.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="w-full text-left px-3 py-3 hover:bg-slate-50/80 focus:bg-slate-50 transition-all border-b border-slate-50/50 last:border-0 group"
                            type="button"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm ring-2 ring-white group-hover:scale-105 transition-transform">
                                    {user.ho_ten.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                                        {user.ho_ten}
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            {user.so_dien_thoai}
                                        </span>
                                        <span className="text-xs text-slate-400 truncate">
                                            {user.email}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query.length >= 1 && !loading && users.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-4 text-center text-sm text-slate-500">
                    Không tìm thấy kết quả
                </div>
            )}
        </div>
    );
}
