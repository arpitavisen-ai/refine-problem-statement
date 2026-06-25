import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Edit2, Check, ExternalLink } from 'lucide-react';

interface ResearchItem {
  id: string;
  title: string;
  description: string;
}

interface MarketResearchGridProps {
  items: ResearchItem[];
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const ITEM_IMAGES: Record<string, string> = {
  '1': 'https://images.unsplash.com/photo-1523875194681-bedd468c58bf?w=1200&h=600&fit=crop&auto=format',
  '2': 'https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=800&h=500&fit=crop&auto=format',
  '3': 'https://images.unsplash.com/photo-1686771416537-bf4a4f263d88?w=800&h=500&fit=crop&auto=format',
  '4': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=500&fit=crop&auto=format',
  '5': 'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=800&h=500&fit=crop&auto=format',
  '6': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=500&fit=crop&auto=format',
  '7': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&auto=format',
};
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1711097383282-28097ae16b1d?w=800&h=500&fit=crop&auto=format';

const PHASE_LABELS = [
  'Landscape Audit',
  'Current State',
  'User Research',
  'Tech Evaluation',
  'Business Model',
  'Compliance',
  'Measurement',
];

const PHASE_COLORS = [
  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
];

function getImage(id: string) {
  return ITEM_IMAGES[id] ?? FALLBACK_IMAGE;
}

function getPhaseLabel(index: number) {
  return PHASE_LABELS[index] ?? 'Research';
}

function getPhaseColor(index: number) {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

function EditableField({
  value, onChange, multiline, className, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  if (editing) {
    if (multiline) {
      return (
        <textarea
          value={temp}
          onChange={e => setTemp(e.target.value)}
          onBlur={() => { onChange(temp); setEditing(false); }}
          className={`${className} bg-transparent border border-blue-500/40 rounded px-2 py-1 w-full resize-none focus:outline-none focus:ring-1 focus:ring-blue-500`}
          autoFocus
          rows={Math.max(3, temp.split('\n').length + 1)}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onChange(temp); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(temp); setEditing(false); } }}
        className={`${className} bg-transparent border border-blue-500/40 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500`}
        autoFocus
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => { setEditing(true); setTemp(value); }}
      className={`${className} cursor-pointer hover:bg-white/5 rounded px-1 py-0.5 transition-colors ${!value ? 'opacity-40' : ''}`}
    >
      {value || (placeholder ?? 'Click to edit...')}
    </div>
  );
}

function ItemModal({
  item, index, open, onClose, onUpdate, onDelete,
}: {
  item: ResearchItem;
  index: number;
  open: boolean;
  onClose: () => void;
  onUpdate: (field: string, value: string) => void;
  onDelete: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-0 flex items-center justify-center z-50 p-6 outline-none">
          <Dialog.Title className="sr-only">{item.title || 'Research item'}</Dialog.Title>
          <div className="bg-[#0C1526] border border-white/10 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl">
            <div className="relative h-56 bg-[#080F1E] overflow-hidden">
              <img
                src={getImage(item.id)}
                alt={item.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C1526] via-transparent to-transparent" />
              <div className="absolute top-4 left-4">
                <span
                  className={`inline-block text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${getPhaseColor(index)}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {getPhaseLabel(index)}
                </span>
              </div>
              <Dialog.Close className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors border border-white/20">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>
            <div className="p-7">
              <EditableField
                value={item.title}
                onChange={v => onUpdate('title', v)}
                className="text-2xl font-semibold text-white mb-4 block"
                placeholder="Research title..."
              />
              <EditableField
                value={item.description}
                onChange={v => onUpdate('description', v)}
                multiline
                className="text-sm text-slate-300 leading-relaxed block"
                placeholder="Describe the research activity, scope, and expected outcomes..."
              />
              <div className="mt-6 pt-5 border-t border-white/8 flex justify-between items-center">
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove item
                </button>
                <Dialog.Close className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                  Done
                </Dialog.Close>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HeroCard({ item, index, onOpen }: { item: ResearchItem; index: number; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0F1A2E] border border-white/7 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20 flex flex-col lg:flex-row"
    >
      <div className="lg:w-[45%] relative h-64 lg:h-auto bg-[#080F1E] overflow-hidden flex-shrink-0">
        <img
          src={getImage(item.id)}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
        />
        <div className="absolute inset-0 lg:hidden bg-gradient-to-t from-[#0F1A2E]/80 to-transparent" />
      </div>
      <div className="flex-1 p-8 flex flex-col justify-center">
        <div className="flex items-start justify-between mb-2">
          <span
            className={`inline-block text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1 rounded-full border mb-4 ${getPhaseColor(index)}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {getPhaseLabel(index)}
          </span>
          <span className="text-xs text-slate-600 font-mono">01</span>
        </div>
        <h3
          className="text-2xl font-semibold text-white mb-3 leading-snug"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {item.title || 'Untitled Research'}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {item.description || 'No description yet.'}
        </p>
        <div className="flex items-center gap-1.5 text-sm text-blue-400 font-medium group-hover:gap-2.5 transition-all duration-200">
          Read more
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

function GridCard({ item, index, onOpen }: { item: ResearchItem; index: number; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-xl overflow-hidden bg-[#0F1A2E] border border-white/7 hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20 hover:-translate-y-0.5 flex flex-col"
    >
      <div className="relative h-44 bg-[#080F1E] overflow-hidden flex-shrink-0">
        <img
          src={getImage(item.id)}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A2E]/60 to-transparent" />
        <div className="absolute top-3 left-3">
          <span
            className={`inline-block text-[9px] font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${getPhaseColor(index)}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {getPhaseLabel(index)}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3
          className="text-lg font-semibold text-white mb-2 leading-snug"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {item.title || 'Untitled'}
        </h3>
        <p className="text-slate-400 text-xs leading-relaxed flex-1 line-clamp-3">
          {item.description || 'No description yet.'}
        </p>
        <div className="mt-4 flex items-center gap-1 text-xs text-blue-400 font-medium group-hover:gap-2 transition-all duration-200">
          View details
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ListCard({ item, index, onOpen }: { item: ResearchItem; index: number; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-xl overflow-hidden bg-[#0F1A2E] border border-white/7 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/10 flex items-stretch gap-0"
    >
      <div className="relative w-32 flex-shrink-0 bg-[#080F1E] overflow-hidden">
        <img
          src={getImage(item.id)}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-75"
        />
      </div>
      <div className="flex-1 px-5 py-4 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`inline-block text-[9px] font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${getPhaseColor(index)}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {getPhaseLabel(index)}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <h3
          className="text-base font-semibold text-white mb-1 leading-snug"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {item.title || 'Untitled'}
        </h3>
        <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
          {item.description || 'No description yet.'}
        </p>
      </div>
    </div>
  );
}

export function MarketResearchGrid({ items, onUpdate, onDelete, onAdd }: MarketResearchGridProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const heroItem = items[0];
  const gridItems = items.slice(1, 4);
  const listItems = items.slice(4);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400 mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Research Agenda
          </p>
          <h2
            className="text-3xl font-semibold text-white leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Market Research Activities
          </h2>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Activity
        </button>
      </div>

      <div className="space-y-6">
        {heroItem && (
          <HeroCard item={heroItem} index={0} onOpen={() => setOpenId(heroItem.id)} />
        )}

        {gridItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {gridItems.map((item, i) => (
              <GridCard key={item.id} item={item} index={i + 1} onOpen={() => setOpenId(item.id)} />
            ))}
          </div>
        )}

        {listItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/7" />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Additional Activities
              </span>
              <div className="h-px flex-1 bg-white/7" />
            </div>
            {listItems.map((item, i) => (
              <ListCard key={item.id} item={item} index={i + 4} onOpen={() => setOpenId(item.id)} />
            ))}
          </div>
        )}
      </div>

      {items.map((item, index) => (
        <ItemModal
          key={item.id}
          item={item}
          index={index}
          open={openId === item.id}
          onClose={() => setOpenId(null)}
          onUpdate={(field, value) => onUpdate(item.id, field, value)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </div>
  );
}
