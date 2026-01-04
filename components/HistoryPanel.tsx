import React, { useState } from 'react';
import { Commit, UILanguage } from '../types';
import { translations } from '../translations';
import { History, RotateCcw, Plus, Clock } from 'lucide-react';

interface HistoryPanelProps {
  commits: Commit[];
  onCommit: (message: string) => void;
  onRevert: (commit: Commit) => void;
  lang: UILanguage;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ commits, onCommit, onRevert, lang }) => {
  const [message, setMessage] = useState('');
  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onCommit(message);
      setMessage('');
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
          {t.newCommit}
        </label>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.commitPlaceholder}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-600 text-slate-300"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md flex items-center justify-center transition-colors"
            title={t.newCommit}
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 h-full">
            <History className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">{t.noCommits}</p>
            <p className="text-xs text-slate-600 mt-1">{t.makeChanges}</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {commits.map((commit) => (
              <div key={commit.id} className="relative pl-10 group">
                <div className="absolute left-3 top-4 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-600 group-hover:border-blue-500 group-hover:bg-blue-900 transition-colors z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover:bg-blue-400 transition-colors"></div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-200 line-clamp-1">{commit.message}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-2">
                      <Clock className="w-3 h-3" />
                      {formatDate(commit.timestamp)}
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-slate-700/30">
                     <div className="flex gap-2 text-xs text-slate-500 font-mono opacity-70">
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{commit.series}</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{commit.files.length} {t.files}</span>
                     </div>
                     <button 
                        onClick={() => onRevert(commit)}
                        className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded hover:bg-emerald-400/10"
                        title="Revert to this state"
                     >
                        <RotateCcw className="w-3 h-3" />
                        {t.revert}
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;