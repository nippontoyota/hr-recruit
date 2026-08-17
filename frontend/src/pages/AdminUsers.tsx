import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Search, Eye, EyeOff } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';
import type { User } from '../types';
import { toast } from 'sonner';
import { Button, Modal, Input, LoadingSpinner, Select } from '../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Forms
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'LOCAL_HR',
    branch_location: '',
    department: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [branchFilter, setBranchFilter] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    if (!formData.email) {
      toast.error("Please provide an email address");
      return;
    }
    if (!formData.full_name) {
      toast.error("Please provide a full name");
      return;
    }
    if (!formData.password) {
      toast.error("Please provide a password");
      return;
    }

    if (formData.role === 'LOCAL_HR' && !formData.branch_location) {
      toast.error("Please select a branch location");
      return;
    }

    setSubmitting(true);
    try {
      const newUser = await createUser(formData);
      toast.success(`Access granted! Account ${newUser.email} was created.`);
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        branch_location: formData.branch_location || null,
        department: formData.department || null,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await updateUser(selectedUser.id, updateData);
      toast.success("User updated successfully");
      setIsEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      role: user.role,
      branch_location: user.branch_location || '',
      department: user.department || ''
    });
    setShowPassword(false);
    setIsEditOpen(true);
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };
  
  const openCreate = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'LOCAL_HR',
      branch_location: '',
      department: ''
    });
    setShowPassword(false);
    setIsCreateOpen(true);
  };

  const localHRUsers = users.filter(u => {
    if (u.role !== 'LOCAL_HR') return false;
    const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = branchFilter ? u.branch_location === branchFilter : true;
    return matchesSearch && matchesBranch;
  });

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage access and roles for all platform users</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 !bg-red-600 hover:!bg-red-700 !text-white !border-none !rounded-md font-semibold px-4 py-2">
          <Plus className="w-4 h-4" /> Add Access
        </Button>
      </div>

      <div className="space-y-8">
        
        {/* ADMIN SECTION */}
        {users.filter(u => u.role === 'ADMIN').length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">ADMIN</h2>
            <div className="flex flex-col border border-border rounded-md bg-surface">
              {users.filter(u => u.role === 'ADMIN').map(u => (
                <div key={u.id} onClick={() => openEdit(u)} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-gray-200 text-gray-700">
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{u.full_name}</div>
                      <div className="text-muted-foreground text-xs">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-gray-50 text-gray-600 border-gray-200">
                        GLOBAL ACCESS
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HO HR SECTION */}
        {users.filter(u => u.role === 'HO_HR').length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">HEAD OFFICE HR</h2>
            <div className="flex flex-col border border-border rounded-md bg-surface">
              {users.filter(u => u.role === 'HO_HR').map(u => (
                <div key={u.id} onClick={() => openEdit(u)} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-emerald-100 text-emerald-700">
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{u.full_name}</div>
                      <div className="text-muted-foreground text-xs">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-gray-50 text-gray-600 border-gray-200">
                        GLOBAL ACCESS
                      </span>
                    </div>
                    <div className="flex items-center gap-1 border-l border-border pl-3">
                      <button onClick={(e) => { e.stopPropagation(); openDelete(u); }} className="p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger rounded transition-colors" title="Delete User">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOCAL HR SECTION */}
        <div>
          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between mb-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1">LOCAL HR</h2>
            <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <Input 
                  type="text" 
                  placeholder="Search local HR..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftElement={<Search className="w-4 h-4 text-muted-foreground" />}
                  className="bg-surface shadow-sm border-border h-8 text-xs"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select 
                  value={branchFilter} 
                  onChange={(e: any) => setBranchFilter(e.target.value)}
                  className="bg-surface shadow-sm border-border h-8 text-xs"
                >
                  <option value="">All Branches</option>
                  <option value="Enchakkal">Enchakkal</option>
                  <option value="Kazhakootam">Kazhakootam</option>
                  <option value="Kochuveli">Kochuveli</option>
                  <option value="Kalamassery (Nippon Towers)">Kalamassery (Nippon Towers)</option>
                  <option value="Nettoor">Nettoor</option>
                  <option value="Muvattupuzha">Muvattupuzha</option>
                  <option value="Puzhakkal (Ayyanthole)">Puzhakkal (Ayyanthole)</option>
                  <option value="Nadathara">Nadathara</option>
                  <option value="Vellangallur (Irinjalakuda)">Vellangallur (Irinjalakuda)</option>
                  <option value="Nattakom">Nattakom</option>
                  <option value="Thellakom">Thellakom</option>
                  <option value="Pala">Pala</option>
                  <option value="Kottiyam (Kollam)">Kottiyam (Kollam)</option>
                  <option value="Pathanamthitta">Pathanamthitta</option>
                  <option value="Thiruvalla">Thiruvalla</option>
                  <option value="Kayamkulam">Kayamkulam</option>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col border border-border rounded-md bg-surface min-h-[100px]">
            {localHRUsers.length === 0 ? (
              <div className="py-8 text-center m-auto">
                <p className="text-muted-foreground text-sm">No local HR found.</p>
              </div>
            ) : (
              localHRUsers.map(u => {
                const getBranchColor = (branch: string | null) => {
                  if (!branch) return 'bg-gray-100 text-gray-700 border-gray-200';
                  const colorList = [
                    'bg-blue-50 text-blue-700 border-blue-200',
                    'bg-cyan-50 text-cyan-700 border-cyan-200',
                    'bg-sky-50 text-sky-700 border-sky-200',
                    'bg-indigo-50 text-indigo-700 border-indigo-200',
                    'bg-violet-50 text-violet-700 border-violet-200',
                    'bg-purple-50 text-purple-700 border-purple-200',
                    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
                    'bg-pink-50 text-pink-700 border-pink-200',
                    'bg-rose-50 text-rose-700 border-rose-200',
                    'bg-red-50 text-red-700 border-red-200',
                    'bg-orange-50 text-orange-700 border-orange-200',
                    'bg-amber-50 text-amber-700 border-amber-200',
                    'bg-lime-50 text-lime-700 border-lime-200',
                    'bg-green-50 text-green-700 border-green-200',
                    'bg-emerald-50 text-emerald-700 border-emerald-200',
                  ];
                  let hash = 0;
                  for (let i = 0; i < branch.length; i++) {
                    hash = branch.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  return colorList[Math.abs(hash) % colorList.length];
                };
                
                return (
                  <div key={u.id} onClick={() => openEdit(u)} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-amber-100 text-amber-700">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{u.full_name}</div>
                        <div className="text-muted-foreground text-xs">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBranchColor(u.branch_location)}`}>
                          {u.branch_location}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 border-l border-border pl-3">
                        <button onClick={(e) => { e.stopPropagation(); openDelete(u); }} className="p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger rounded transition-colors" title="Delete User">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? "Edit User Access" : "Grant New Access"} size="md">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
              <Input 
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                placeholder="e.g. John Doe"
                className="bg-surface border-border shadow-sm rounded-md h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
              <Input 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="e.g. john@nipponhr.com"
                className="bg-surface border-border shadow-sm rounded-md h-9 text-sm"
                type="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Access Role</label>
              <Select 
                value={formData.role} 
                onChange={(e: any) => setFormData({...formData, role: e.target.value})} 
                className="bg-surface border-border shadow-sm rounded-md h-9 text-sm w-full"
                disabled={selectedUser?.role === 'ADMIN'}
              >
                {formData.role === 'ADMIN' && <option value="ADMIN">System Admin</option>}
                <option value="HO_HR">Head Office HR</option>
                <option value="LOCAL_HR">Local Branch HR</option>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                {isEditOpen ? "Reset Password" : "Password"}
              </label>
              <Input 
                type={showPassword ? "text" : "password"} 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder={isEditOpen ? "Leave blank to keep current" : "Secure password"} 
                className="bg-surface border-border shadow-sm rounded-md h-9 text-sm"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>
          </div>

          {formData.role === 'LOCAL_HR' && (
            <div className="pt-2 border-t border-border/50 mt-4">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 text-primary">Assign Branch Location</label>
              <Select 
                value={formData.branch_location} 
                onChange={(e: any) => setFormData({...formData, branch_location: e.target.value})} 
                className="bg-primary/5 border-primary/20 shadow-sm rounded-md h-9 text-sm w-full font-medium"
              >
                <option value="">Select branch...</option>
                <option value="Enchakkal">Enchakkal</option>
                <option value="Kazhakootam">Kazhakootam</option>
                <option value="Kochuveli">Kochuveli</option>
                <option value="Kalamassery (Nippon Towers)">Kalamassery (Nippon Towers)</option>
                <option value="Nettoor">Nettoor</option>
                <option value="Muvattupuzha">Muvattupuzha</option>
                <option value="Puzhakkal (Ayyanthole)">Puzhakkal (Ayyanthole)</option>
                <option value="Nadathara">Nadathara</option>
                <option value="Vellangallur (Irinjalakuda)">Vellangallur (Irinjalakuda)</option>
                <option value="Nattakom">Nattakom</option>
                <option value="Thellakom">Thellakom</option>
                <option value="Pala">Pala</option>
                <option value="Kottiyam (Kollam)">Kottiyam (Kollam)</option>
                <option value="Pathanamthitta">Pathanamthitta</option>
                <option value="Thiruvalla">Thiruvalla</option>
                <option value="Kayamkulam">Kayamkulam</option>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-6">
            <Button variant="ghost" className="h-9 px-4 text-sm" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>Cancel</Button>
            <Button variant="primary" className="h-9 px-6 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold border-none" onClick={isEditOpen ? handleUpdate : handleCreate} isLoading={submitting}>
              {isEditOpen ? "Save Changes" : "Grant Access"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete User" size="sm">
        <div className="p-6">
          <p className="text-foreground text-sm mb-6">Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="primary" className="bg-danger hover:bg-danger/90 border-transparent text-white" onClick={handleDelete} isLoading={submitting}>Delete User</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
