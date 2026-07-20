import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Search } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';
import type { User } from '../types';
import { toast } from 'sonner';
import { Button, Modal, Input, LoadingSpinner } from '../components/ui';

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
    role: 'BRANCH_HR',
    branch_location: '',
    department: ''
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (!formData.email || !formData.full_name || !formData.password || !formData.role) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await createUser(formData);
      toast.success("User created successfully");
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
      role: 'BRANCH_HR',
      branch_location: '',
      department: ''
    });
    setIsCreateOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground text-sm">Manage access and roles for all platform users</p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search users by name, email, or role..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Branch / Dept</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{u.full_name}</div>
                    <div className="text-muted-foreground text-xs">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider">
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-foreground">{u.branch_location || '-'}</div>
                    <div className="text-muted-foreground text-xs">{u.department || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(u)} className="p-2 text-muted-foreground hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => openDelete(u)} className="p-2 text-muted-foreground hover:text-danger transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={isCreateOpen || isEditOpen} onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }} title={isEditOpen ? "Edit User" : "Create New User"} size="md">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name</label>
            <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email</label>
            <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" disabled={isEditOpen} />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">{isEditOpen ? "New Password (Optional)" : "Password"}</label>
            <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="********" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 bg-background border border-border rounded-xl">
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="COMPANY_HR_HEAD">Company HR Head</option>
              <option value="BRANCH_HR">Branch HR</option>
              <option value="HQ_HR">HQ HR</option>
              <option value="DEPT_HEAD">Department Head</option>
              <option value="BRANCH_VP">Branch VP</option>
              <option value="SERVICE_VP">Service VP</option>
              <option value="HQ_STAFF">HQ Staff</option>
              <option value="FINANCE">Finance</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Branch (Optional)</label>
              <Input value={formData.branch_location} onChange={e => setFormData({...formData, branch_location: e.target.value})} placeholder="Kochi" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Department (Optional)</label>
              <Input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="IT" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>Cancel</Button>
            <Button variant="primary" onClick={isEditOpen ? handleUpdate : handleCreate} isLoading={submitting}>
              {isEditOpen ? "Save Changes" : "Create User"}
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
