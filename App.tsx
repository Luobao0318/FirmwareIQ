import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Cpu, 
  FileCode, 
  Settings, 
  Download,
  Check,
  Code2,
  GitBranch,
  Activity,
  FolderOpen,
  PanelLeft,
  PanelRight
} from 'lucide-react';

import { STM32Series, CodeLanguage, AnalysisResult, Commit, ProjectFile, UILanguage, LibraryType } from './types';
import { DEFAULT_FILES, STM32_SERIES_OPTIONS } from './constants';
import { translations } from './translations';
import * as geminiService from './services/geminiService';
import CodeEditor from './components/CodeEditor';
import AnalysisPanel from './components/AnalysisPanel';
import HistoryPanel from './components/HistoryPanel';
import FileExplorer from './components/FileExplorer';

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>(DEFAULT_FILES);
  const [activeFileName, setActiveFileName] = useState<string>(DEFAULT_FILES[0].name);
  const [selectedSeries, setSelectedSeries] = useState<STM32Series>(STM32Series.F4);
  const [libraryType, setLibraryType] = useState<LibraryType>(LibraryType.HAL);
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(UILanguage.CN);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [isFixing, setIsFixing] = useState(false);
  const [fixedCode, setFixedCode] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'editor' | 'fixed'>('editor');
  const [activeRightPanel, setActiveRightPanel] = useState<'diagnostics' | 'history'>('diagnostics');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Panel Visibility State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const t = translations[uiLanguage];

  // Helper to get active file content
  const activeFileContent = files.find(f => f.name === activeFileName)?.content || '';

  // When fixed code arrives, switch tab
  useEffect(() => {
    if (fixedCode) {
      setActiveTab('fixed');
    }
  }, [fixedCode]);

  const updateActiveFileContent = (newContent: string) => {
    setFiles(prev => prev.map(f => 
      f.name === activeFileName ? { ...f, content: newContent } : f
    ));
  };

  // --- File System Operations ---

  const handleCreateFile = (path: string, isFolder: boolean) => {
     // Check if exists
     if (files.some(f => f.name === path)) {
       alert("File already exists!");
       return;
     }

     const newFile: ProjectFile = {
       name: isFolder ? `${path}/.gitkeep` : path,
       content: isFolder ? '' : '// New file',
       language: CodeLanguage.C // Default, improved detection could be added
     };

     setFiles(prev => [...prev, newFile]);
     
     if (!isFolder) {
       setActiveFileName(newFile.name);
       setActiveTab('editor');
     }
  };

  const handleRenameFile = (oldPath: string, newPath: string) => {
    setFiles(prev => prev.map(f => {
      if (f.name === oldPath) {
        // Exact match (File rename)
        return { ...f, name: newPath };
      } else if (f.name.startsWith(oldPath + '/')) {
        // Folder rename (prefix match)
        return { ...f, name: f.name.replace(oldPath, newPath) };
      }
      return f;
    }));

    // Update active file name if it was moved/renamed
    if (activeFileName === oldPath) {
      setActiveFileName(newPath);
    } else if (activeFileName.startsWith(oldPath + '/')) {
      setActiveFileName(activeFileName.replace(oldPath, newPath));
    }
  };

  const handleDeleteFile = (path: string) => {
    // Prevent deleting the last file if it's the only one
    if (files.length <= 1 && files[0].name === path) return;

    // Filter out file or all files in folder
    const newFiles = files.filter(f => f.name !== path && !f.name.startsWith(path + '/'));
    setFiles(newFiles);

    // If active file deleted, switch
    if (activeFileName === path || activeFileName.startsWith(path + '/')) {
       // Try to find a file that is NOT a gitkeep if possible
       const nextFile = newFiles.find(f => !f.name.endsWith('.gitkeep'));
       if (nextFile) {
         setActiveFileName(nextFile.name);
       } else if (newFiles.length > 0) {
         setActiveFileName(newFiles[0].name);
       } else {
         // Should not happen due to guard check, but just in case
         setActiveFileName(''); 
       }
    }
    
    // Invalidate analysis
    setAnalysisResult(null);
    setFixedCode(null);
    setActiveTab('editor');
  };

  // --- End File System Operations ---

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisResult(null);
    setFixedCode(null);
    if (!rightPanelOpen) setRightPanelOpen(true);
    setActiveRightPanel('diagnostics');
    
    try {
      // Filter out .gitkeep files for analysis
      const analyzableFiles = files.filter(f => !f.name.endsWith('.gitkeep'));
      const result = await geminiService.analyzeCode(analyzableFiles, selectedSeries, libraryType);
      setAnalysisResult(result);
    } catch (err) {
      setErrorMsg(t.analysisFailed);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFix = async () => {
    if (!analysisResult) return;
    setIsFixing(true);
    setErrorMsg(null);

    try {
      // Fix only the active file using project context
      // Filter out gitkeeps for context
      const contextFiles = files.filter(f => !f.name.endsWith('.gitkeep'));
      const fixed = await geminiService.fixCode(contextFiles, activeFileName, selectedSeries, analysisResult.issues, libraryType);
      setFixedCode(fixed);
    } catch (err) {
      setErrorMsg(t.fixFailed);
    } finally {
      setIsFixing(false);
    }
  };

  const applyFix = () => {
    if (fixedCode) {
      updateActiveFileContent(fixedCode);
      setFixedCode(null);
      setAnalysisResult(null);
      setActiveTab('editor');
    }
  };

  const handleCommit = (message: string) => {
    const newCommit: Commit = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: Date.now(),
      files: JSON.parse(JSON.stringify(files)), // Deep copy
      series: selectedSeries,
    };
    setCommits(prev => [newCommit, ...prev]);
  };

  const handleRevert = (commit: Commit) => {
    if (confirm(`${t.confirmRevert} "${commit.message}"? ${t.unsavedLost}`)) {
      setFiles(JSON.parse(JSON.stringify(commit.files))); // Deep copy
      setSelectedSeries(commit.series);
      
      const currentActiveStillExists = commit.files.some(f => f.name === activeFileName);
      if (!currentActiveStillExists && commit.files.length > 0) {
         const nextFile = commit.files.find(f => !f.name.endsWith('.gitkeep')) || commit.files[0];
         setActiveFileName(nextFile.name);
      }

      setAnalysisResult(null);
      setFixedCode(null);
      setActiveTab('editor');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: ProjectFile[] = [];
    let filesProcessed = 0;

    Array.from(fileList).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Basic language detection
        let lang = CodeLanguage.C;
        if (file.name.endsWith('.cpp') || file.name.endsWith('.hpp')) lang = CodeLanguage.CPP;
        if (file.name.endsWith('.s') || file.name.endsWith('.asm')) lang = CodeLanguage.ASM;

        newFiles.push({
          name: file.webkitRelativePath || file.name, 
          content: content,
          language: lang
        });
        
        filesProcessed++;
        if (filesProcessed === fileList.length) {
          // Sort by name for stability
          newFiles.sort((a, b) => a.name.localeCompare(b.name));
          setFiles(newFiles);
          
          const firstRealFile = newFiles.find(f => !f.name.endsWith('.gitkeep'));
          if (firstRealFile) setActiveFileName(firstRealFile.name);
          
          setAnalysisResult(null);
          setFixedCode(null);
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Sidebar / Config */}
      <div 
        className={`${leftPanelOpen ? 'w-64 border-r' : 'w-0 border-r-0'} flex-shrink-0 bg-slate-900 border-slate-700 flex flex-col z-20 transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <div className="w-64 h-full flex flex-col"> {/* Fixed width container to prevent content squashing */}
            <div className="p-4 border-b border-slate-800 flex-shrink-0">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
                <Cpu className="text-blue-500" />
                {t.appTitle}
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{t.appSubtitle}</p>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Controls Scroll Area */}
            <div className="p-4 space-y-6 overflow-y-auto flex-shrink-0 max-h-[60%] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                
                {/* Language Toggle */}
                <div className="flex justify-between items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setUiLanguage(UILanguage.EN)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded transition-colors ${uiLanguage === UILanguage.EN ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    EN
                </button>
                <button 
                    onClick={() => setUiLanguage(UILanguage.CN)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded transition-colors ${uiLanguage === UILanguage.CN ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    中
                </button>
                </div>

                {/* Target Series */}
                <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.targetSeries}</label>
                <div className="relative">
                    <select 
                    value={selectedSeries} 
                    onChange={(e) => setSelectedSeries(e.target.value as STM32Series)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                    >
                    {STM32_SERIES_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                    </select>
                    <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                    <Settings className="w-4 h-4" />
                    </div>
                </div>
                </div>

                {/* Library Type Selector */}
                <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.libraryType}</label>
                <div className="flex bg-slate-800 p-1 rounded-md border border-slate-700">
                    <button 
                    onClick={() => setLibraryType(LibraryType.HAL)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${libraryType === LibraryType.HAL ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                    {t.libHAL}
                    </button>
                    <button 
                    onClick={() => setLibraryType(LibraryType.STD)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${libraryType === LibraryType.STD ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                    {t.libSTD}
                    </button>
                </div>
                </div>

                {/* File Actions */}
                <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.loadFiles}</label>
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col items-center justify-center gap-1 border border-dashed border-slate-600 rounded-md p-2 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800/50 cursor-pointer transition-all">
                        <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                        <FileCode className="w-4 h-4" />
                        <span className="text-[10px]">{t.files}</span>
                    </label>
                    <label className="flex flex-col items-center justify-center gap-1 border border-dashed border-slate-600 rounded-md p-2 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800/50 cursor-pointer transition-all">
                        <input 
                        type="file" 
                        // @ts-ignore
                        webkitdirectory="" 
                        directory="" 
                        multiple 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        />
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-[10px]">{t.loadFolder}</span>
                    </label>
                </div>
                </div>

                <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isFixing}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-bold shadow-lg transition-all ${
                    isAnalyzing 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/20'
                }`}
                >
                {isAnalyzing ? (
                    <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {t.analyzing}
                    </>
                ) : (
                    <>
                    <Play className="w-4 h-4 fill-current" />
                    {t.runDiagnostics}
                    </>
                )}
                </button>
            </div>

            {/* File Explorer Section */}
            <div className="flex-1 border-t border-slate-800 min-h-0 bg-slate-900 overflow-hidden flex flex-col">
                <FileExplorer 
                files={files} 
                activeFileName={activeFileName} 
                onSelectFile={setActiveFileName}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onCreateFile={handleCreateFile}
                lang={uiLanguage}
                />
            </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center flex-shrink-0">
            {t.poweredBy}
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Bar for Tabs */}
        <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between shrink-0">
           <div className="flex items-center gap-3">
             <button
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${!leftPanelOpen ? 'bg-slate-800 text-blue-400' : ''}`}
                title="Toggle Sidebar"
             >
               <PanelLeft className="w-4 h-4" />
             </button>

             <div className="h-4 w-px bg-slate-700 mx-1"></div>

             <button
               onClick={() => setActiveTab('editor')}
               className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'editor' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
             >
               <Code2 className="w-4 h-4" />
               {t.sourceCode}
               <span className="text-xs opacity-50 ml-1 border-l border-slate-600 pl-2 max-w-[150px] truncate">{activeFileName}</span>
             </button>
             {fixedCode && (
               <button
                 onClick={() => setActiveTab('fixed')}
                 className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'fixed' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <Check className="w-4 h-4" />
                 {t.aiRepair}
               </button>
             )}
           </div>
           
           <div className="flex items-center gap-3">
             {activeTab === 'fixed' && (
               <div className="flex gap-2">
                  <button
                   onClick={() => setFixedCode(null)}
                   className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {t.discard}
                  </button>
                  <button
                    onClick={applyFix}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    {t.applyFix}
                  </button>
               </div>
             )}
             
             <div className="h-4 w-px bg-slate-700 mx-1"></div>

             <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${!rightPanelOpen ? 'bg-slate-800 text-blue-400' : ''}`}
                title="Toggle Panel"
             >
                <PanelRight className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative flex overflow-hidden">
          <div className="flex-1 flex flex-col h-full min-w-0">
             {activeTab === 'editor' ? (
                <CodeEditor 
                  key={activeFileName} // Force re-mount on file change to reset cursor/scroll if needed
                  code={activeFileContent} 
                  onChange={updateActiveFileContent} 
                  readOnly={activeFileName.endsWith('.gitkeep')}
                />
             ) : (
                <CodeEditor code={fixedCode || ''} onChange={() => {}} readOnly={true} />
             )}
          </div>

          {/* Right Panel Container */}
          <div 
            className={`${rightPanelOpen ? 'w-96 border-l' : 'w-0 border-l-0'} flex-shrink-0 h-full flex flex-col bg-slate-900 border-slate-700/50 transition-all duration-300 ease-in-out overflow-hidden`}
          >
             <div className="w-96 h-full flex flex-col"> {/* Fixed width container */}
                {/* Right Panel Tabs */}
                <div className="flex border-b border-slate-800 flex-shrink-0">
                <button 
                    onClick={() => setActiveRightPanel('diagnostics')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeRightPanel === 'diagnostics' ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <Activity className="w-3.5 h-3.5" />
                    {t.diagnostics}
                </button>
                <button 
                    onClick={() => setActiveRightPanel('history')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeRightPanel === 'history' ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <GitBranch className="w-3.5 h-3.5" />
                    {t.history}
                    {commits.length > 0 && (
                    <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] min-w-[1.25rem]">{commits.length}</span>
                    )}
                </button>
                </div>

                {/* Right Panel Content */}
                <div className="flex-1 overflow-hidden relative">
                {activeRightPanel === 'diagnostics' ? (
                    <AnalysisPanel 
                        result={analysisResult} 
                        isLoading={isAnalyzing} 
                        onFix={handleFix} 
                        isFixing={isFixing}
                        lang={uiLanguage}
                    />
                ) : (
                    <HistoryPanel 
                        commits={commits} 
                        onCommit={handleCommit} 
                        onRevert={handleRevert} 
                        lang={uiLanguage}
                    />
                )}
                </div>
             </div>
          </div>
        </div>

        {/* Global Error Toast */}
        {errorMsg && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-bounce-in z-50">
             <div className="w-4 h-4"><AlertTriangleIcon /></div>
             {errorMsg}
             <button onClick={() => setErrorMsg(null)} className="ml-2 hover:bg-white/20 rounded-full p-0.5">
               <span className="sr-only">Dismiss</span>
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}