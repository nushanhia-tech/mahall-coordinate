import { useApp } from '../store/AppContext';
import { CrudManager } from '../components/ui';

export default function UsersAdmin() {
  const { state, add, patch, remove, toast, user } = useApp();
  const admins = state.users.filter((u) => u.role === 'admin').length;
  const linkLabel = (u) => {
    if (u.householdId) { const h = state.households.find((x) => x.id === u.householdId); return h ? `${h.homeNo} · ${h.headName}` : '—'; }
    if (u.institutionId) return state.institutions.find((x) => x.id === u.institutionId)?.name || '—';
    return '—';
  };
  const validate = (d, id) => {
    if (!id && !d.password) { toast('Set a password for the new user', 'error'); return false; }
    if (state.users.some((u) => u.username === d.username && u.id !== id)) { toast('Username already taken', 'error'); return false; }
    if (d.role === 'institution' && !d.institutionId) { toast('Pick the institution for this account', 'error'); return false; }
    if (d.role !== 'institution') d.institutionId = '';
    if (d.role !== 'individual') d.householdId = '';
    return true;
  };
  return (
    <CrudManager
      title="Portal Users"
      addLabel="Add user"
      items={state.users}
      searchKeys={['name', 'username', 'role']}
      defaults={{ role: 'individual' }}
      fields={[
        { name: 'name', label: 'Display name', required: true },
        { name: 'username', label: 'Username', required: true },
        { name: 'password', label: 'Password (leave blank to keep)', type: 'password' },
        { name: 'role', label: 'Role', type: 'select', required: true, options: [{ value: 'admin', label: 'Admin' }, { value: 'individual', label: 'Individual' }, { value: 'khateeb', label: 'Khateeb' }, { value: 'institution', label: 'Institution' }], render: (u) => <span className="badge bg-brand-100 text-brand-800 capitalize">{u.role}</span> },
        { name: 'householdId', label: 'Linked home (individuals)', type: 'select', table: false, options: state.households.map((h) => ({ value: h.id, label: `${h.homeNo} · ${h.headName}` })) },
        { name: 'institutionId', label: 'Linked institution', type: 'select', table: false, options: state.institutions.map((i) => ({ value: i.id, label: i.name })) },
        { name: 'link', label: 'Linked to', form: false, render: linkLabel },
      ]}
      canDelete={(u) => u.id !== user.id && !(u.role === 'admin' && admins <= 1)}
      onAdd={(d) => { if (validate(d)) { add('users', d); toast('User created'); } }}
      onUpdate={(id, d) => {
        const old = state.users.find((u) => u.id === id);
        if (old.role === 'admin' && d.role !== 'admin' && admins <= 1) return toast('You cannot remove the last admin', 'error');
        if (id === user.id && d.role !== 'admin') return toast('You cannot change your own role', 'error');
        if (validate(d, id)) { patch('users', id, d); toast('User updated'); }
      }}
      onDelete={(id) => { remove('users', id); toast('User deleted'); }}
    />
  );
}
