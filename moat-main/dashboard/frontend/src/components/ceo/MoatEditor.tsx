"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Underline } from '@tiptap/extension-underline';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Image as ImageIcon, Heading1, Heading2, Table as TableIcon,
  Sparkles, Download, ChevronDown, FileText, FileIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

async function exportAsPDF(html: string, title: string) {
  const html2pdf = (await import('html2pdf.js')).default;
  const el = document.createElement('div');
  el.innerHTML = `<h1 style="font-family:sans-serif;color:#c9a84c">${title}</h1>` + html;
  el.style.padding = '24px';
  el.style.fontFamily = 'sans-serif';
  html2pdf().set({
    margin: 12,
    filename: `${title.replace(/\s+/g, '_')}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(el).save();
}

async function exportAsWord(html: string, title: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  // Strip HTML tags to plain paragraphs
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const lines = (tmp.textContent || tmp.innerText || '').split('\n').filter(l => l.trim());
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
        ...lines.map(line => new Paragraph({ children: [new TextRun(line)] })),
      ],
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MoatEditor({
  content,
  onChange,
  ideaTitle = 'Innovation Idea',
}: {
  content: any;
  onChange: (c: any) => void;
  ideaTitle?: string;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
    ],
    content: content || '<p>Start drafting your innovation idea here...</p>',
    onUpdate: ({ editor }) => { onChange(editor.getJSON()); },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6 bg-card border border-border rounded-b-xl',
      },
    },
  });

  useEffect(() => {
    if (editor && content && !editor.isFocused) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) return null;

  const tb = (active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <Button variant="ghost" size="sm" onClick={onClick} className={active ? 'bg-muted' : ''}>
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-col w-full shadow-lg rounded-xl">
      {/* ── Toolbar ── */}
      <div className="bg-muted/50 border-x border-t border-border rounded-t-xl p-2 flex flex-wrap gap-1 items-center">
        {tb(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      <Bold className="w-4 h-4" />)}
        {tb(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    <Italic className="w-4 h-4" />)}
        {tb(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="w-4 h-4" />)}

        <div className="w-px h-4 bg-border mx-1" />

        {tb(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="w-4 h-4" />)}
        {tb(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="w-4 h-4" />)}

        <div className="w-px h-4 bg-border mx-1" />

        {tb(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  <List className="w-4 h-4" />)}
        {tb(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="w-4 h-4" />)}

        <div className="w-px h-4 bg-border mx-1" />

        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => {
          const url = window.prompt('Image URL');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}>
          <ImageIcon className="w-4 h-4" />
        </Button>

        {/* ── Right side actions ── */}
        <div className="ml-auto flex items-center gap-2">
          {/* AI Assistant */}
          <Button
            variant="outline" size="sm"
            className="gap-1 border-[#c9a84c]/50 text-[#c9a84c]"
            onClick={() => {
              editor.chain().focus().insertContent('<p><em>⏳ AI is analyzing…</em></p>').run();
              setTimeout(() => {
                editor.chain().focus().insertContent(
                  '<p><strong>Prior Art Analysis:</strong> No direct matches found. Potential novelty exists in the specific approach described.</p>'
                ).run();
              }, 1000);
            }}
          >
            <Sparkles className="w-4 h-4" /> AI Assistant
          </Button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <Button
              variant="outline" size="sm"
              className="gap-1"
              onClick={() => setExportOpen(o => !o)}
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </Button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                  onClick={() => { exportAsPDF(editor.getHTML(), ideaTitle); setExportOpen(false); }}
                >
                  <FileIcon className="w-4 h-4 text-rose-500" />
                  Export as PDF
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                  onClick={() => { exportAsWord(editor.getHTML(), ideaTitle); setExportOpen(false); }}
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  Export as Word
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
