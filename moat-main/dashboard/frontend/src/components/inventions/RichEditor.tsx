"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Image as ImageIcon, Table as TableIcon, Heading1, Heading2, Quote, Undo, Redo } from 'lucide-react';
import { useEffect } from 'react';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export function RichEditor({ content, onChange, editable = true }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const MenuBar = () => {
    return (
      <div className="flex flex-wrap items-center gap-1 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-2 text-sm text-[hsl(var(--muted-foreground))]">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('bold') ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('italic') ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('underline') ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <div className="mx-2 h-4 w-px bg-[hsl(var(--border))]" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('heading', { level: 1 }) ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('heading', { level: 2 }) ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <div className="mx-2 h-4 w-px bg-[hsl(var(--border))]" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('bulletList') ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('orderedList') ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded p-1.5 hover:bg-[hsl(var(--muted))] ${editor.isActive('blockquote') ? 'bg-[hsl(var(--muted))] text-foreground' : ''}`}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>

        <div className="mx-2 h-4 w-px bg-[hsl(var(--border))]" />

        <button
          onClick={() => {
            const url = window.prompt('URL');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className="rounded p-1.5 hover:bg-[hsl(var(--muted))]"
          title="Add Image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="rounded p-1.5 hover:bg-[hsl(var(--muted))]"
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </button>

        <div className="mx-auto flex-1" />

        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="rounded p-1.5 hover:bg-[hsl(var(--muted))] disabled:opacity-50">
          <Undo className="h-4 w-4" />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="rounded p-1.5 hover:bg-[hsl(var(--muted))] disabled:opacity-50">
          <Redo className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-md border border-[hsl(var(--border))] bg-background">
      <MenuBar />
      <EditorContent editor={editor} className="cursor-text" />
    </div>
  );
}
