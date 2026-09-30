import { ArrowUp, ImagePlus, Loader2, PanelRightClose, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTRPC } from '@/providers/query-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Picture = { url: string; name: string };

type Step = {
  id: number;
  request: string;
  pictures: Picture[];
  status: 'working' | 'done' | 'failed' | 'undone';
  reply?: string;
  /** The email as it was before this step, to undo it. */
  before?: string;
};

export type AssistantMode = 'plain' | 'email';

interface ComposeAssistantProps {
  open: boolean;
  onClose: () => void;
  /** 'plain' for a normal email, 'email' for a designed (template) email. */
  mode: AssistantMode;
  getHtml: () => string;
  applyHtml: (html: string) => void;
  /** Text of the conversation being replied to, if any. */
  context?: string;
}

const SUGGESTIONS: Record<AssistantMode, string[]> = {
  plain: ['Write a short, friendly follow-up', 'Make it more formal', 'Make it shorter', 'Fix spelling and grammar'],
  email: ['Rewrite the title to be more engaging', 'Use a navy accent colour', 'Make the text shorter', 'Replace the main picture'],
};

const panel = {
  hidden: { width: 0, opacity: 0 },
  visible: { width: 'auto', opacity: 1 },
};

/**
 * Side assistant for the composer: describe a change, the AI applies it to the
 * email, and every request stays in a short history that can be undone.
 */
export function ComposeAssistant({ open, onClose, mode, getHtml, applyHtml, context }: ComposeAssistantProps) {
  const trpc = useTRPC();
  const [steps, setSteps] = useState<Step[]>([]);
  const [text, setText] = useState('');
  const [pictures, setPictures] = useState<Picture[]>([]);
  const { upload, isUploading } = useImageUpload();
  const { mutateAsync: editDesign } = useMutation(trpc.ai.editDesign.mutationOptions());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pictureInput = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const working = steps.some((step) => step.status === 'working');
  const lastApplied = [...steps].reverse().find((step) => step.status === 'done');

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [steps]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  const update = (id: number, patch: Partial<Step>) =>
    setSteps((items) => items.map((step) => (step.id === id ? { ...step, ...patch } : step)));

  const ask = async (request: string) => {
    const instruction = request.trim();
    if (instruction.length < 2 || working) return;
    const id = nextId.current++;
    const attached = pictures;
    setSteps((items) => [...items, { id, request: instruction, pictures: attached, status: 'working' }]);
    setText('');
    setPictures([]);
    const before = getHtml();
    try {
      const result = await editDesign({
        mode,
        instruction,
        html: before,
        images: attached,
        ...(context ? { context } : {}),
      });
      applyHtml(result.html);
      update(id, { status: 'done', reply: result.summary, before });
    } catch (error) {
      update(id, { status: 'failed', reply: error instanceof Error ? error.message : 'The AI could not apply this change.' });
    }
  };

  const undo = (step: Step) => {
    if (step.before === undefined) return;
    applyHtml(step.before);
    update(step.id, { status: 'undone' });
  };

  const addPicture = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await upload(file);
      setPictures((items) => [...items, { url, name: file.name }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="assistant"
          variants={panel}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className="z-20 flex min-h-0 shrink-0 overflow-hidden border-l border-[#E7E7E7] bg-[#FAFAFA] dark:border-[#2B2B2B] dark:bg-[#1A1A1A] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          aria-label="Email assistant"
        >
          <div className="flex w-[340px] max-w-[calc(100vw-3rem)] flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-[#E7E7E7] px-3 py-2.5 dark:border-[#2B2B2B]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0b2431]">
                  <Sparkles className="h-3.5 w-3.5 text-[#a7d8d1]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">Assistant</p>
                  <p className="text-muted-foreground truncate text-[11px] leading-tight">
                    {mode === 'email' ? 'Edits your designed email' : 'Writes and edits your email'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Hide assistant"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>

            {/* History */}
            <div ref={listRef} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {steps.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="pt-2"
                >
                  <p className="text-sm font-medium">What should I change?</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Describe it in your own words. I apply it to the email and you can undo any step.
                  </p>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {SUGGESTIONS[mode].map((suggestion, index) => (
                      <motion.button
                        key={suggestion}
                        type="button"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.05 }}
                        onClick={() => void ask(suggestion)}
                        className="bg-background hover:border-[#a7d8d1] hover:bg-[#a7d8d1]/10 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {steps.map((step) => (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5"
                    >
                      {/* Request */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#0b2431] px-3 py-2 text-xs leading-relaxed text-white">
                          {step.request}
                          {step.pictures.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {step.pictures.map((picture) => (
                                <img key={picture.url} src={picture.url} alt={picture.name} className="h-8 w-8 rounded object-cover" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Reply */}
                      <div className="flex justify-start">
                        {step.status === 'working' ? (
                          <div className="bg-background flex items-center gap-1 rounded-2xl rounded-bl-sm border px-3 py-2.5">
                            {[0, 1, 2].map((dot) => (
                              <motion.span
                                key={dot}
                                className="h-1.5 w-1.5 rounded-full bg-[#71b9b1]"
                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                                transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl rounded-bl-sm border px-3 py-2 text-xs leading-relaxed',
                              step.status === 'failed'
                                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
                                : 'bg-background',
                            )}
                          >
                            <p className={cn(step.status === 'undone' && 'text-muted-foreground line-through')}>{step.reply}</p>
                            {step.status === 'undone' && <p className="text-muted-foreground mt-1 text-[11px]">Undone</p>}
                            {step === lastApplied && (
                              <button
                                type="button"
                                onClick={() => undo(step)}
                                disabled={working}
                                className="text-muted-foreground hover:text-foreground mt-1.5 flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="h-3 w-3" /> Undo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[#E7E7E7] p-2.5 dark:border-[#2B2B2B]">
              <AnimatePresence initial={false}>
                {pictures.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-2 flex flex-wrap gap-1.5 overflow-hidden"
                  >
                    {pictures.map((picture) => (
                      <span key={picture.url} className="bg-background flex items-center gap-1 rounded-md border py-0.5 pl-0.5 pr-1 text-[11px]">
                        <img src={picture.url} alt="" className="h-5 w-5 rounded object-cover" />
                        <span className="max-w-[110px] truncate">{picture.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${picture.name}`}
                          onClick={() => setPictures((items) => items.filter((item) => item.url !== picture.url))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="bg-background focus-within:border-[#71b9b1] rounded-xl border transition-colors">
                <textarea
                  ref={inputRef}
                  value={text}
                  rows={2}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void ask(text);
                    }
                  }}
                  placeholder={mode === 'email' ? 'e.g. change the title, the colours or a picture…' : 'e.g. reply to accept the meeting on Tuesday…'}
                  className="placeholder:text-muted-foreground block max-h-32 w-full resize-none bg-transparent px-3 pt-2 text-xs outline-none"
                />
                <div className="flex items-center justify-between px-1.5 pb-1.5">
                  <button
                    type="button"
                    onClick={() => pictureInput.current?.click()}
                    disabled={isUploading || working}
                    title="Add a picture"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    Picture
                  </button>
                  <input
                    ref={pictureInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void addPicture(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void ask(text)}
                    disabled={working || text.trim().length < 2}
                    aria-label="Apply"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0b2431] text-[#a7d8d1] transition-all hover:bg-[#173f4e] disabled:opacity-40"
                  >
                    {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-muted-foreground mt-1.5 text-center text-[10px]">Enter to apply · Shift+Enter for a new line</p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
