"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

export function QuillEditor({
  content,
  onChange,
  editable = true,
}: {
  content?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "The page is blank. Begin the turning…",
      }),
    ],
    content: content || "",
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] focus:outline-none prose prose-p:mb-4 max-w-none text-[19px] leading-[1.7]",
      },
    },
  });

  useEffect(() => {
    if (!editor || content == null) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  return (
    <div className="laid-paper rounded-sm px-8 py-10 md:px-12">
      <EditorContent editor={editor} />
    </div>
  );
}
