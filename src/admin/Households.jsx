import { useApp } from '../store/AppContext';
import { CrudManager } from '../components/ui';
import { downloadPdf } from '../utils/pdf';

export default function Households() {
  const { state, add, patch, remove, toast } = useApp();
  const nextNo = () => {
    const nums = state.households.map((h) => parseInt(String(h.homeNo).replace(/\D/g, ''), 10) || 0);
    return 'MH-' + String(Math.max(0, ...nums) + 1).padStart(3, '0');
  };
  const pdf = () => downloadPdf({
    org: state.masjid, title: 'Household Register', subtitle: `${state.households.length} homes · ${state.households.reduce((a, h) => a + Number(h.members), 0)} people`,
    blocks: [{ table: { head: ['Home No', 'Head of family', 'Members', 'Ward', 'Phone', 'Address'], body: state.households.map((h) => [h.homeNo, h.headName, h.members, h.ward, h.phone, h.address]) } }],
  }, 'household-register.pdf');
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className="btn-outline" onClick={pdf}>Download register PDF</button></div>
      <CrudManager
        title="Households"
        items={state.households}
        searchKeys={['homeNo', 'headName', 'phone', 'ward']}
        defaults={{ homeNo: nextNo(), members: 1, ward: 'Ward 1' }}
        fields={[
          { name: 'homeNo', label: 'Home No', required: true },
          { name: 'headName', label: 'Head of family', required: true },
          { name: 'members', label: 'Members', type: 'number', min: 1, required: true },
          { name: 'ward', label: 'Ward' },
          { name: 'phone', label: 'Phone' },
          { name: 'address', label: 'Address', full: true },
        ]}
        onAdd={(d) => {
          if (state.households.some((h) => h.homeNo === d.homeNo)) return toast('That home number already exists', 'error');
          add('households', d); toast('Household added – dashboard counters updated');
        }}
        onUpdate={(id, d) => { patch('households', id, d); toast('Household updated'); }}
        onDelete={(id) => { remove('households', id); toast('Household removed'); }}
      />
    </div>
  );
}
