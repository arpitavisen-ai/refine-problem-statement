import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Target, AlertTriangle, Zap, Lightbulb, Edit2, Check } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PersonaCardProps {
  imageUrl: string;
  title: string;
  goals: string;
  painPoints: string;
  motivators: string;
  opportunities: string;
  onUpdate: (field: string, value: string) => void;
}

function SectionBlock({
  icon,
  label,
  accentClass,
  dotClass,
  value,
  field,
  onUpdate,
}: {
  icon: React.ReactNode;
  label: string;
  accentClass: string;
  dotClass: string;
  value: string;
  field: string;
  onUpdate: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const items = value.split('\n').filter(Boolean);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-4">
        <span className={accentClass}>{icon}</span>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </h4>
        <button
          onClick={() => { setEditing(!editing); setTempValue(value); }}
          className="ml-auto text-slate-600 hover:text-slate-300 transition-colors p-1 rounded hover:bg-white/5"
        >
          {editing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      {editing ? (
        <textarea
          value={tempValue}
          onChange={e => setTempValue(e.target.value)}
          onBlur={() => { onUpdate(field, tempValue); setEditing(false); }}
          rows={Math.max(3, tempValue.split('\n').length + 1)}
          className="w-full bg-[#080F1E] border border-blue-500/40 rounded-lg px-3 py-2.5 text-sm text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
          autoFocus
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed">
              <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PersonaCard({
  imageUrl, title, goals, painPoints, motivators, opportunities, onUpdate
}: PersonaCardProps) {
  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const firstGoal = goals.split('\n').filter(Boolean)[0] || '';

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[#0F1A2E] border border-white/7 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/30 hover:-translate-y-1"
      >
        <div className="relative h-64 bg-[#080F1E] overflow-hidden">
          <ImageWithFallback
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A2E] via-[#0F1A2E]/30 to-transparent" />
        </div>

        <div className="p-6">
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-3"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            User Persona
          </span>
          <h3
            className="text-2xl font-semibold text-white mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h3>
          {firstGoal && (
            <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-2">{firstGoal}</p>
          )}
          <div className="flex items-center gap-1.5 text-sm text-blue-400 font-medium group-hover:gap-2.5 transition-all duration-200">
            View full profile
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0C1526] border-l border-white/8 z-50 overflow-y-auto shadow-2xl outline-none"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Dialog.Title className="sr-only">{title} — User Persona</Dialog.Title>
            <div className="relative h-72 bg-[#080F1E] overflow-hidden flex-shrink-0">
              <ImageWithFallback src={imageUrl} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C1526] via-[#0C1526]/20 to-transparent" />
              <Dialog.Close className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors border border-white/20">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            <div className="px-8 pt-6 pb-10">
              <span
                className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-4"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                User Persona
              </span>

              {editingTitle ? (
                <input
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onBlur={() => { onUpdate('title', tempTitle); setEditingTitle(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') { onUpdate('title', tempTitle); setEditingTitle(false); } }}
                  className="text-3xl font-semibold text-white bg-transparent border-b border-blue-500/60 focus:outline-none w-full mb-8 pb-1"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => { setEditingTitle(true); setTempTitle(title); }}
                  className="text-3xl font-semibold text-white cursor-pointer hover:text-blue-300 transition-colors mb-8 group/title flex items-center gap-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {title}
                  <Edit2 className="w-4 h-4 opacity-0 group-hover/title:opacity-40 transition-opacity" />
                </h2>
              )}

              <div className="grid grid-cols-2 gap-x-10 border-t border-white/7 pt-8">
                <SectionBlock
                  icon={<Target className="w-4 h-4" />}
                  label="Goals"
                  accentClass="text-blue-400"
                  dotClass="bg-blue-400"
                  value={goals}
                  field="goals"
                  onUpdate={onUpdate}
                />
                <SectionBlock
                  icon={<AlertTriangle className="w-4 h-4" />}
                  label="Pain Points"
                  accentClass="text-amber-400"
                  dotClass="bg-amber-400"
                  value={painPoints}
                  field="painPoints"
                  onUpdate={onUpdate}
                />
                <SectionBlock
                  icon={<Zap className="w-4 h-4" />}
                  label="Motivators"
                  accentClass="text-emerald-400"
                  dotClass="bg-emerald-400"
                  value={motivators}
                  field="motivators"
                  onUpdate={onUpdate}
                />
                <SectionBlock
                  icon={<Lightbulb className="w-4 h-4" />}
                  label="Opportunities"
                  accentClass="text-purple-400"
                  dotClass="bg-purple-400"
                  value={opportunities}
                  field="opportunities"
                  onUpdate={onUpdate}
                />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
