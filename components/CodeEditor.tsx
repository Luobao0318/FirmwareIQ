import React, { useRef, useState, useEffect } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, readOnly = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(0);

  // Sync scroll and highlight position
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop } = textareaRef.current;
      
      // Sync line numbers
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      
      // Sync highlight bar
      if (highlightRef.current) {
         // p-4 = 1rem = 16px
         // leading-6 = 1.5rem = 24px
         // We use transform to move the highlight bar. 
         // Position = Initial Padding + (Line Index * Line Height) - Scroll Offset
         highlightRef.current.style.transform = `translateY(${16 + activeLine * 24 - scrollTop}px)`;
      }
    }
  };

  const updateActiveLine = () => {
    if (textareaRef.current) {
      const { value, selectionStart } = textareaRef.current;
      // Calculate line number by counting newlines before cursor
      const line = value.substring(0, selectionStart).split('\n').length - 1;
      setActiveLine(line);
    }
  };

  // Update highlight position when activeLine changes (e.g. via keys/click)
  useEffect(() => {
     handleScroll();
  }, [activeLine]);
  
  // Ensure we check active line on code changes (e.g. pasting)
  useEffect(() => {
    // If lines are deleted, activeLine might be out of bounds, but splitting string handles it.
    // We defer slightly to ensure ref values are current if necessary, but usually synchronous is fine here.
    updateActiveLine();
  }, [code]);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="relative flex h-full font-mono text-sm bg-slate-950 text-slate-300">
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="hidden sm:block w-12 flex-shrink-0 bg-slate-900 border-r border-slate-700 text-right pr-2 py-4 select-none overflow-hidden text-slate-500"
      >
        {lineNumbers.map((num, i) => (
          <div 
            key={num} 
            className={`leading-6 h-6 transition-colors ${i === activeLine ? 'text-blue-400 font-bold' : ''}`}
          >
            {num}
          </div>
        ))}
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Active Line Highlight - Absolute positioned background */}
        <div 
            ref={highlightRef}
            className="absolute left-0 right-0 h-6 bg-slate-800/50 pointer-events-none border-l-2 border-blue-500"
            style={{ top: 0, transition: 'transform 0.05s linear' }} 
        />

        {/* Editor Area */}
        <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onSelect={updateActiveLine}
            onClick={updateActiveLine}
            onKeyUp={updateActiveLine}
            readOnly={readOnly}
            spellCheck={false}
            className={`absolute inset-0 w-full h-full bg-transparent border-0 p-4 resize-none focus:ring-0 focus:outline-none leading-6 whitespace-pre ${readOnly ? 'opacity-80' : ''}`}
            style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;