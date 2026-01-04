import React, { useState, useMemo } from 'react';
import { ProjectFile, UILanguage } from '../types';
import { FileText, Folder, FolderOpen, Trash2, Plus, FilePlus, FolderPlus, ChevronRight, ChevronDown, Edit2, Search, X } from 'lucide-react';
import { translations } from '../translations';

interface FileExplorerProps {
  files: ProjectFile[];
  activeFileName: string;
  onSelectFile: (name: string) => void;
  onDeleteFile: (name: string) => void; // Expects full path
  onRenameFile: (oldPath: string, newPath: string) => void;
  onCreateFile: (path: string, isFolder: boolean) => void;
  lang: UILanguage;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: Record<string, TreeNode>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  activeFileName, 
  onSelectFile, 
  onDeleteFile,
  onRenameFile,
  onCreateFile,
  lang 
}) => {
  const t = translations[lang];
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter files based on search query
  const displayFiles = useMemo(() => {
    if (!searchQuery) return files;
    const lowerQuery = searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(lowerQuery));
  }, [files, searchQuery]);

  // Build Tree Structure from filtered file list
  const tree = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', type: 'folder', children: {} };
    
    displayFiles.forEach(file => {
      const parts = file.name.split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');
        
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: path,
            type: isFile ? 'file' : 'folder',
            children: {}
          };
        }
        current = current.children[part];
      });
    });
    return root;
  }, [displayFiles]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleStartRename = (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    setEditingId(node.path);
    setEditName(node.name);
  };

  const handleSubmitRename = (node: TreeNode) => {
    if (editName && editName !== node.name) {
      // Calculate new path
      const pathParts = node.path.split('/');
      pathParts.pop(); // Remove old name
      const newPath = pathParts.length > 0 ? `${pathParts.join('/')}/${editName}` : editName;
      onRenameFile(node.path, newPath);
    }
    setEditingId(null);
  };

  const handleCreateClick = (isFolder: boolean) => {
    const base = selectedFolder ? `${selectedFolder}/` : '';
    const name = prompt(t.enterName);
    if (name) {
      onCreateFile(`${base}${name}`, isFolder);
      if (selectedFolder) {
        setExpandedFolders(prev => new Set(prev).add(selectedFolder));
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, node: TreeNode) => {
     e.stopPropagation();
     if (confirm(`${t.confirmDelete} ${node.name}?`)) {
       onDeleteFile(node.path);
     }
  };

  const renderTree = (node: TreeNode, depth: number = 0) => {
    // Force expand all folders when searching, otherwise use state
    const isExpanded = searchQuery ? true : (expandedFolders.has(node.path) || depth === 0); 
    
    const children = Object.values(node.children).sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    if (node.name === 'root') {
        return <div className="space-y-0.5">{children.map(child => renderTree(child, depth))}</div>;
    }

    const isActive = node.type === 'file' && node.path === activeFileName;
    const isSelected = node.type === 'folder' && node.path === selectedFolder;
    const isEditing = editingId === node.path;

    return (
      <div key={node.path}>
        <div 
          className={`
            group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors select-none
            ${isActive ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : ''}
            ${isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'}
            ${!isActive && !isSelected ? 'text-slate-400' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
              setSelectedFolder(node.path === selectedFolder ? null : node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {node.type === 'folder' && (
               <span className="opacity-70">
                 {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
               </span>
            )}
            
            {node.type === 'folder' ? (
              isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-400/80" /> : <Folder className="w-3.5 h-3.5 text-amber-400/80" />
            ) : (
              <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
            )}

            {isEditing ? (
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleSubmitRename(node)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitRename(node)}
                autoFocus
                className="bg-slate-950 border border-blue-500 rounded px-1 py-0.5 text-xs text-white min-w-[50px] w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`truncate font-mono ${isActive ? 'font-medium' : ''}`}>{node.name}</span>
            )}
          </div>

          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
             <button onClick={(e) => handleStartRename(e, node)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400">
               <Edit2 className="w-3 h-3" />
             </button>
             <button onClick={(e) => handleDeleteClick(e, node)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
               <Trash2 className="w-3 h-3" />
             </button>
          </div>
        </div>

        {node.type === 'folder' && isExpanded && (
          <div>
            {children.map(child => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-2 bg-slate-900 border-b border-slate-800">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-800"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
         <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
           {t.files}
         </span>
         <div className="flex items-center gap-1">
            <button 
              onClick={() => handleCreateClick(false)} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title={t.newFile}
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleCreateClick(true)} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title={t.newFolder}
            >
              <FolderPlus className="w-4 h-4" />
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {displayFiles.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-600">
             {searchQuery ? 'No matching files' : 'No files'}
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>
      
      {/* Active Folder Indicator */}
      <div className="px-3 py-1 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 font-mono truncate">
        {selectedFolder ? `${selectedFolder}/` : '/'}
      </div>
    </div>
  );
};

export default FileExplorer;