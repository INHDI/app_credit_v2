'use client';

import { useState, useEffect, FormEvent } from 'react';
import { AuthApi, User, RegisterRequest } from '@/services/authApi';
import { getRoleDisplayName, useAuth } from '@/providers/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Plus,
    X,
    Search,
    Mail,
    Phone,
    Shield,
    AlertCircle,
    CheckCircle,
    Lock,
    User as UserIcon,
    Pencil,
    Trash2,
    Calendar
} from 'lucide-react';

type UserRole = 'admin' | 'collector' | 'debtor';

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form states
    const [formData, setFormData] = useState<RegisterRequest>({
        email: '',
        password: '',
        ho_ten: '',
        so_dien_thoai: '',
        role: 'debtor',
    });

    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        setError('');
        try {
            const role = roleFilter === 'all' ? undefined : roleFilter;
            const data = await AuthApi.getUsers(role);
            setUsers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    // Handle Create
    const openCreateModal = () => {
        setFormData({
            email: '',
            password: '',
            ho_ten: '',
            so_dien_thoai: '',
            role: 'debtor',
        });
        setFormError('');
        setFormSuccess('');
        setShowCreateModal(true);
    };

    const handleCreateUser = async (e: FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            await AuthApi.register(formData);
            setFormSuccess('Tạo người dùng thành công!');
            fetchUsers();
            setTimeout(() => {
                setShowCreateModal(false);
                setFormSuccess('');
            }, 1000);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể tạo người dùng');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Edit
    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            password: '', // Password optional for update
            ho_ten: user.ho_ten,
            so_dien_thoai: user.so_dien_thoai,
            role: user.role,
        });
        setFormError('');
        setFormSuccess('');
        setShowEditModal(true);
    };

    const handleUpdateUser = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setFormLoading(true);
        setFormError('');

        try {
            // Updated to handle partial updates properly
            // Ideally we should have a separate updateUser API that accepts partial data
            // For now assuming existing API can handle it or we reuse register structure
            const updateData: any = {
                ho_ten: formData.ho_ten,
                so_dien_thoai: formData.so_dien_thoai,
                email: formData.email,
                role: formData.role
            };

            await AuthApi.updateUser(selectedUser.id, updateData);
            setFormSuccess('Cập nhật thành công!');
            fetchUsers();
            setTimeout(() => {
                setShowEditModal(false);
                setFormSuccess('');
                setSelectedUser(null);
            }, 1000);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Lỗi cập nhật');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle Delete
    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setFormLoading(true);
        try {
            await AuthApi.deleteUser(selectedUser.id);
            setShowDeleteModal(false);
            fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Không thể xóa');
        } finally {
            setFormLoading(false);
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchQuery === '' ||
            user.ho_ten.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.so_dien_thoai.includes(searchQuery);
        return matchesSearch;
    });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-700 border-purple-200 ring-purple-500/30';
            case 'collector':
                return 'bg-blue-100 text-blue-700 border-blue-200 ring-blue-500/30';
            case 'debtor':
                return 'bg-amber-100 text-amber-700 border-amber-200 ring-amber-500/30';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/30';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/20">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        Quản lý người dùng
                    </h1>
                    <p className="text-slate-500 mt-2 pl-14">
                        Quản lý toàn bộ tài khoản và phân quyền trong hệ thống
                    </p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={openCreateModal}
                        className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 rounded-2xl transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Thêm mới
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, email, SĐT..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-0 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:bg-white rounded-2xl transition-all duration-200"
                        />
                    </div>

                    {/* Role filter */}
                    <div className="relative min-w-[200px]">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="block w-full pl-4 pr-10 py-3 bg-slate-50 border-0 text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:bg-white rounded-2xl appearance-none transition-all duration-200 cursor-pointer"
                        >
                            <option value="all">Tất cả vai trò</option>
                            <option value="admin">Quản trị viên</option>
                            <option value="collector">Nhân viên thu</option>
                            <option value="debtor">Người nợ</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <Shield className="h-4 w-4 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50/50 backdrop-blur border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        </div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Không tìm thấy người dùng</h3>
                        <p className="text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc thêm người dùng mới</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Thành viên</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Liên hệ</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vai trò</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</th>
                                        {isAdmin && (
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${user.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                                                        user.role === 'collector' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                                            'bg-gradient-to-br from-amber-500 to-orange-600'
                                                        }`}>
                                                        {user.ho_ten.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">{user.ho_ten}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <Calendar className="w-3 h-3" />
                                                            Joined {new Date(user.created_at || Date.now()).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        {user.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        {user.so_dien_thoai}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className={`px-2.5 py-0.5 rounded-lg border-0 ring-1 ring-inset font-medium shadow-none ${getRoleBadgeColor(user.role)}`}>
                                                    {getRoleDisplayName(user.role)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(user)}
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openDeleteModal(user)}
                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4 p-4">
                            {filteredUsers.map((user) => (
                                <div key={`mobile-${user.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${user.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                                                user.role === 'collector' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                                    'bg-gradient-to-br from-amber-500 to-orange-600'
                                                }`}>
                                                {user.ho_ten.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{user.ho_ten}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    Joined {new Date(user.created_at || Date.now()).toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={`px-2 py-0.5 rounded-lg border-0 ring-1 ring-inset font-medium shadow-none text-xs ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleDisplayName(user.role)}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            {user.so_dien_thoai}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500">Trạng thái:</span>
                                            {user.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                            <Button
                                                variant="outline"
                                                className="flex-1 h-9 bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                                                onClick={() => openEditModal(user)}
                                            >
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Chỉnh sửa
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1 h-9 bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 hover:border-red-300"
                                                onClick={() => openDeleteModal(user)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Xóa
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => {
                            setShowCreateModal(false);
                            setShowEditModal(false);
                        }}
                    />
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {showEditModal ? 'Cập nhật thông tin' : 'Thêm thành viên'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    {showEditModal ? 'Chỉnh sửa thông tin tài khoản' : 'Tạo tài khoản mới vào hệ thống'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={showEditModal ? handleUpdateUser : handleCreateUser} className="p-8 space-y-6">
                            {formError && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600 animate-pulse">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">{formError}</span>
                                </div>
                            )}

                            {formSuccess && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">{formSuccess}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Họ và tên</label>
                                    <div className="relative group">
                                        <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.ho_ten}
                                            onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium placeholder:font-normal"
                                            placeholder="Nhập họ và tên..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Role</label>
                                        <div className="relative">
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium appearance-none"
                                            >
                                                <option value="debtor">Người nợ</option>
                                                <option value="collector">Thu nợ</option>
                                                <option value="admin">Quản trị</option>
                                            </select>
                                            <Shield className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Số điện thoại</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                            <input
                                                type="tel"
                                                required
                                                value={formData.so_dien_thoai}
                                                onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium"
                                                placeholder="09..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium"
                                            placeholder="example@mail.com"
                                        />
                                    </div>
                                </div>

                                {!showEditModal && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Mật khẩu</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                            <input
                                                type="password"
                                                required
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all font-medium"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                    }}
                                    className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 h-12 rounded-2xl border-0"
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-2xl shadow-xl shadow-slate-900/10"
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        showEditModal ? 'Lưu thay đổi' : 'Tạo tài khoản'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa</h2>
                        <p className="text-slate-600 mb-6">
                            Bạn có chắc chắn muốn xóa người dùng <span className="font-bold text-slate-900">{selectedUser.ho_ten}</span>?
                            <br />Hành động này không thể hoàn tác.
                        </p>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 h-12 rounded-2xl border-0"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                onClick={handleDeleteUser}
                                disabled={formLoading}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white h-12 rounded-2xl shadow-xl shadow-red-500/20"
                            >
                                {formLoading ? 'Đang xóa...' : 'Xóa ngay'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
