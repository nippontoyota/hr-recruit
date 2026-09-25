import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Unlink } from 'lucide-react';
import { useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RichTextEditor({ value, onChange, className = '' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-info underline hover:text-info/80',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 text-sm text-text-primary',
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className="h-[200px] animate-pulse rounded-lg bg-surface-hover" />;
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-lg border border-border bg-surface ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface-hover p-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`rounded p-1.5 transition-colors ${editor.isActive('bold') ? 'bg-background-hover text-foreground' : 'text-text-secondary hover:bg-background-hover hover:text-foreground'}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 transition-colors ${editor.isActive('italic') ? 'bg-background-hover text-foreground' : 'text-text-secondary hover:bg-background-hover hover:text-foreground'}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded p-1.5 transition-colors ${editor.isActive('bulletList') ? 'bg-background-hover text-foreground' : 'text-text-secondary hover:bg-background-hover hover:text-foreground'}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded p-1.5 transition-colors ${editor.isActive('orderedList') ? 'bg-background-hover text-foreground' : 'text-text-secondary hover:bg-background-hover hover:text-foreground'}`}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={setLink}
          className={`rounded p-1.5 transition-colors ${editor.isActive('link') ? 'bg-background-hover text-foreground' : 'text-text-secondary hover:bg-background-hover hover:text-foreground'}`}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          className="rounded p-1.5 text-text-secondary transition-colors hover:bg-background-hover hover:text-foreground disabled:opacity-50"
          title="Unlink"
        >
          <Unlink className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} className="cursor-text prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4" onClick={() => editor.commands.focus()} />
    </div>
  );
}
