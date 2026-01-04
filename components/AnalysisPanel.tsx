import React from 'react';
import { AnalysisResult, IssueSeverity, UILanguage } from '../types';
import { translations } from '../translations';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Zap, FileText } from 'lucide-react';

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  onFix: () => void;
  isFixing: boolean;
  lang: UILanguage;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, isLoading, onFix, isFixing, lang }) => {
  const t = translations[lang];

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-4 bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse">{t.analyzingMsg}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-slate-900">
        <Zap className="w-16 h-16 mb-4 opacity-20" />
        <p>{t.readyToAnalyze}</p>
      </div>
    );
  }

  const getIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case IssueSeverity.ERROR: return <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case IssueSeverity.WARNING: return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
      case IssueSeverity.OPTIMIZATION: return <Zap className="w-5 h-5 text-purple-500 flex-shrink-0" />;
      case IssueSeverity.INFO: 
      default: return <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const getBorderColor = (severity: IssueSeverity) => {
     switch (severity) {
      case IssueSeverity.ERROR: return "border-red-500/30 bg-red-500/5";
      case IssueSeverity.WARNING: return "border-amber-500/30 bg-amber-500/5";
      case IssueSeverity.OPTIMIZATION: return "border-purple-500/30 bg-purple-500/5";
      default: return "border-blue-500/30 bg-blue-500/5";
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          {t.diagnostics}
        </h2>
        {result.issues.length > 0 && (
           <button
           onClick={onFix}
           disabled={isFixing}
           className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
         >
           {isFixing ? (
             <>
               <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
               {t.repairing}
             </>
           ) : (
             <>
               <Zap className="w-4 h-4" />
               {t.autoFix}
             </>
           )}
         </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Card */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">{t.summary}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
        </div>

        {/* Issues List */}
        {result.issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-emerald-500">
            <CheckCircle className="w-12 h-12 mb-2" />
            <p className="font-medium">{t.noIssues}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.issues.map((issue, idx) => (
              <div 
                key={idx} 
                className={`border rounded-lg p-3 flex gap-3 transition-colors hover:bg-slate-800/80 ${getBorderColor(issue.severity)}`}
              >
                <div className="mt-1">{getIcon(issue.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        issue.severity === IssueSeverity.ERROR ? 'bg-red-500/20 text-red-400' :
                        issue.severity === IssueSeverity.WARNING ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                    }`}>
                      {issue.severity}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1 text-slate-400">
                        <FileText className="w-3 h-3" />
                        {issue.fileName}
                      </span>
                      <span>:</span>
                      <span>{t.line} {issue.line}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-200 font-medium mb-1">{issue.message}</p>
                  <p className="text-sm text-slate-400 italic">Suggestion: {issue.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;