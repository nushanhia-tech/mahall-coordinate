import { useApp } from '../store/AppContext';
import { CrudManager } from '../components/ui';
import { fmtDate, today } from '../utils/format';

export default function EventsAdmin() {
  const { state, add, patch, remove, toast } = useApp();
  return (
    <div className="space-y-6">
      <CrudManager
        title="Events"
        items={[...state.events].sort((a, b) => a.date.localeCompare(b.date))}
        defaults={{ date: today(), time: '' }}
        searchKeys={['title', 'venue']}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true, render: (e) => <span>{fmtDate(e.date)}{e.rescheduledFrom && <span className="ml-2 badge bg-amber-100 text-amber-800">Rescheduled from {fmtDate(e.rescheduledFrom)}</span>}</span> },
          { name: 'time', label: 'Time', type: 'time' },
          { name: 'venue', label: 'Venue' },
          { name: 'description', label: 'Description', type: 'textarea', table: false },
        ]}
        onAdd={(d) => { add('events', { ...d, rescheduledFrom: '' }); toast('Event added'); }}
        onUpdate={(id, d) => {
          const old = state.events.find((e) => e.id === id);
          const moved = old.date !== d.date;
          patch('events', id, { ...d, rescheduledFrom: moved ? (old.rescheduledFrom || old.date) : old.rescheduledFrom });
          toast(moved ? `Event rescheduled from ${fmtDate(old.date)} to ${fmtDate(d.date)}` : 'Event updated');
        }}
        onDelete={(id) => { remove('events', id); toast('Event deleted'); }}
      />
      <CrudManager
        title="Achievements"
        items={[...state.achievements].sort((a, b) => b.date.localeCompare(a.date))}
        defaults={{ date: today() }}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true, render: (a) => fmtDate(a.date) },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        onAdd={(d) => { add('achievements', d); toast('Achievement added'); }}
        onUpdate={(id, d) => { patch('achievements', id, d); toast('Achievement updated'); }}
        onDelete={(id) => { remove('achievements', id); toast('Achievement deleted'); }}
      />
    </div>
  );
}
