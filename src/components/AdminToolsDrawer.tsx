import React, { useState } from 'react';
import { storageService } from '../services/storage';
import { MediaItem } from '../types';
import {
  X,
  Database,
  RotateCcw,
  Download,
  Upload,
  Lock,
  AlertTriangle,
  Link2
} from 'lucide-react';

interface AdminToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseUpdate: (items: MediaItem[]) => void;
  onLockAdmin: () => void;
  onRunLinkScan?: () => void;
  adminPasscode?: string;
  currentItems?: MediaItem[];
}

export const AdminToolsDrawer: React.FC<AdminToolsDrawerProps> = ({
  isOpen,
  onClose,
  onDatabaseUpdate,
  onLockAdmin,
  onRunLinkScan,
  adminPasscode,
  currentItems,
}) => {
  if (!isOpen) return null;

  const [importError, setImportError] = useState('');

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the database? All items will be cleared or reset.')) {
      const resetData = storageService.resetDatabase();
      onDatabaseUpdate(resetData);
      await storageService.saveArchiveServer(resetData, adminPasscode || storageService.getAdminPasscode());
      alert('Internal database reset and saved to archive.json!');
    }
  };

  const handleExport = () => {
    const jsonStr = storageService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medium_archive_backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const imported = storageService.importDatabaseJSON(jsonContent);
        onDatabaseUpdate(imported.items);
        await storageService.saveArchiveServer(imported.items, adminPasscode || storageService.getAdminPasscode());
        setImportError('');
        alert(`Successfully imported and saved ${imported.items.length} items to server archive.json!`);
      } catch (err) {
        setImportError((err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div
          className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto flex flex-col justify-between text-slate-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-slate-100">
                    DATABASE ENGINE MANAGER
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Archive Management Controls
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Action 1: Export / Download JSON Backup */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Download size={14} className="text-amber-400" /> Export Archive Backup (JSON)
              </h4>
              <p className="text-xs text-slate-400">
                Download your complete internal media database as a portable JSON backup file.
              </p>
              <button
                onClick={handleExport}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Download size={14} /> Export JSON File
              </button>
            </div>

            {/* Action 2: Import JSON File */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Upload size={14} className="text-indigo-400" /> Restore / Import Database JSON
              </h4>
              <p className="text-xs text-slate-400">
                Upload a previously exported database JSON file to restore items.
              </p>

              <label className="w-full py-2 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-800/60 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
                <Upload size={14} /> Select JSON File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              {importError && (
                <p className="text-xs text-rose-400 font-mono flex items-center gap-1 mt-1">
                  <AlertTriangle size={12} /> {importError}
                </p>
              )}
            </div>

            {/* Action: Scan & Link Interconnected Database */}
            {onRunLinkScan && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Link2 size={14} /> Interconnected Link Auto-Detector
                </h4>
                <p className="text-xs text-slate-400">
                  Scan all items, influences, and creator bios to verify and confirm interconnected links.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onRunLinkScan();
                  }}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Link2 size={14} /> Scan & Confirm Database Links
                </button>
              </div>
            )}

            {/* Action 4: Reset Database */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <RotateCcw size={14} /> Restore Default Seed Catalog
              </h4>
              <p className="text-xs text-slate-400">
                Replaces current stored entries with the original 8 curated media items.
              </p>
              <button
                onClick={handleReset}
                className="w-full py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-mono font-bold transition cursor-pointer"
              >
                Reset Database to Seed
              </button>
            </div>
          </div>

          {/* Lock Admin */}
          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={() => {
                onLockAdmin();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Lock size={14} /> Lock & Exit Admin Mode
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

