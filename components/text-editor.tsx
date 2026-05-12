"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  MoreVertical,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  isPanelCollapsed?: boolean
  onExpandPanel?: () => void
  isPanelVisible?: boolean
  onTogglePanel?: () => void
}

export function TextEditor({
  value,
  onChange,
  isPanelCollapsed,
  onExpandPanel,
  isPanelVisible,
  onTogglePanel,
}: TextEditorProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const editor = useEditor({
    // Tiptap renders on the client only here (this is a "use client" component
    // mounted after hydration); disable immediate render to avoid SSR hydration
    // mismatches — required by @tiptap/react in Next.js.
    immediatelyRender: false,
    // Re-render on every transaction so the toolbar's active states stay in sync
    // (the default changed in @tiptap/react v3).
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none p-4 sm:p-6 max-w-[1000px] mx-auto min-h-[calc(100vh-200px)]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 px-2 py-2 sm:px-6 sm:py-4 bg-gradient-to-b from-background via-background to-transparent">
        <div className="flex items-center gap-2 max-w-[1000px] mx-auto">
          <div
            className={cn(
              "glass-strong rounded-3xl shadow-lg shadow-black/5 flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2",
              isMobile ? "inline-flex w-auto ml-auto" : "flex-1 justify-between",
            )}
          >
            <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0 flex-shrink-0"
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0 flex-shrink-0"
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive("bold") && "bg-muted")}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive("italic") && "bg-muted")}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive("underline") && "bg-muted")}
                title="Underline"
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive("bulletList") && "bg-muted")}
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive("orderedList") && "bg-muted")}
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive({ textAlign: "left" }) && "bg-muted")}
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive({ textAlign: "center" }) && "bg-muted")}
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                className={cn("h-8 w-8 p-0 flex-shrink-0", editor.isActive({ textAlign: "right" }) && "bg-muted")}
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

              <select
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "p") {
                    editor.chain().focus().setParagraph().run()
                  } else {
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: Number.parseInt(value.replace("h", "")) as 1 | 2 | 3 })
                      .run()
                  }
                }}
                className="h-8 px-2 text-sm border border-border rounded-lg bg-background/50 backdrop-blur-sm min-w-[90px] flex-shrink-0"
                value={
                  editor.isActive("heading", { level: 1 })
                    ? "h1"
                    : editor.isActive("heading", { level: 2 })
                      ? "h2"
                      : editor.isActive("heading", { level: 3 })
                        ? "h3"
                        : "p"
                }
              >
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
            </div>

            {isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 glass-strong">
                  <DropdownMenuItem onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                    <Undo className="h-4 w-4 mr-2" />
                    Undo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                    <Redo className="h-4 w-4 mr-2" />
                    Redo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="h-4 w-4 mr-2" />
                    Bold
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="h-4 w-4 mr-2" />
                    Italic
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="h-4 w-4 mr-2" />
                    Underline
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="h-4 w-4 mr-2" />
                    Bullet List
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="h-4 w-4 mr-2" />
                    Numbered List
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                    <AlignLeft className="h-4 w-4 mr-2" />
                    Align Left
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                    <AlignCenter className="h-4 w-4 mr-2" />
                    Align Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                    <AlignRight className="h-4 w-4 mr-2" />
                    Align Right
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isMobile && onTogglePanel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onTogglePanel}
                className="h-8 w-8 p-0"
                title={isPanelVisible ? "Hide panel" : "Show panel"}
              >
                {isPanelVisible ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {isPanelCollapsed && onExpandPanel && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExpandPanel}
              className="hidden md:flex p-0 glass-strong rounded-3xl shadow-lg shadow-black/5 items-center justify-center flex-shrink-0 bg-transparent h-[44px] sm:h-[48px] w-[44px] sm:w-[48px]"
              title="Show Panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 cursor-text px-4 sm:px-6" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
