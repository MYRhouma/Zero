import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Upload } from 'lucide-react';
import { useWorkspaceTemplates } from '@/hooks/use-workspace-templates';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTRPC } from '@/providers/query-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Target =
  | { kind: 'image'; element: HTMLImageElement; src: string; alt: string }
  | { kind: 'link'; element: HTMLAnchorElement; href: string };

interface DesignedEmailEditorProps {
  html: string;
  onChange: (html: string) => void;
  /** Name of the template the email started from, used to suggest a new name. */
  templateName?: string;
  subject?: string;
}

const SAFE_ADDRESS = /^(https?:\/\/|mailto:|tel:)/i;
const ALL_BUSINESSES = 'all';
const EDITOR_STYLE = 'data-editor-only';

const serialize = (doc: Document) => `<!doctype html>\n${doc.documentElement.outerHTML}`;

/** Remove editor-only markup before a designed email is sent or saved. */
export const finalizeDesignedHtml = (html: string) =>
  html.replace(/<style data-editor-only="">[\s\S]*?<\/style>/g, '');

/**
 * Edits a complete designed email in place. Texts are typed directly; pictures
 * and links change from a small dialog; the result can be saved as a new
 * workspace template. AI changes come from the composer's assistant panel.
 */
export function DesignedEmailEditor({ html, onChange, templateName, subject }: DesignedEmailEditorProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const current = useRef(html);
  // Each replacement of the whole email loads a new document version into the frame.
  const [doc, setDoc] = useState({ html, version: 0 });
  const [height, setHeight] = useState(600);
  const [target, setTarget] = useState<Target | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const { upload, isUploading } = useImageUpload();
  const { data: templates } = useWorkspaceTemplates();
  const targetPictureInput = useRef<HTMLInputElement>(null);

  // Keep the latest callback without re-running effects on every parent render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emit = useCallback(() => {
    const frameDoc = frameRef.current?.contentDocument;
    if (!frameDoc?.documentElement) return;
    setHeight(Math.max(400, frameDoc.documentElement.scrollHeight));
    current.current = finalizeDesignedHtml(serialize(frameDoc));
    onChangeRef.current(current.current);
  }, []);

  // HTML replaced from outside (the assistant's change or undo) loads as a new version.
  useEffect(() => {
    if (html !== current.current) setDoc((previous) => ({ html, version: previous.version + 1 }));
  }, [html]);

  // A new document version becomes the current email.
  useEffect(() => {
    current.current = doc.html;
    onChangeRef.current(doc.html);
  }, [doc]);

  const handleLoad = useCallback(() => {
    const frameDoc = frameRef.current?.contentDocument;
    if (!frameDoc) return;
    frameDoc.designMode = 'on';
    const style = frameDoc.createElement('style');
    style.setAttribute(EDITOR_STYLE, '');
    style.textContent = 'img{cursor:pointer}img:hover{outline:2px dashed #7c3aed;outline-offset:2px}a{cursor:text}';
    frameDoc.head.appendChild(style);
    frameDoc.addEventListener('input', emit);
    frameDoc.addEventListener('click', (event) => {
      const image = (event.target as HTMLElement).closest('img');
      if (image) {
        event.preventDefault();
        setTarget({ kind: 'image', element: image, src: image.getAttribute('src') ?? '', alt: image.alt });
      }
    });
    frameDoc.addEventListener('dblclick', (event) => {
      const link = (event.target as HTMLElement).closest('a');
      if (link) {
        event.preventDefault();
        setTarget({ kind: 'link', element: link, href: link.getAttribute('href') ?? '' });
      }
    });
    setHeight(Math.max(400, frameDoc.documentElement.scrollHeight));
  }, [emit]);

  const applyTarget = () => {
    if (!target) return;
    const address = (target.kind === 'image' ? target.src : target.href).trim();
    if (address && !SAFE_ADDRESS.test(address)) {
      toast.error('Use an address starting with https://, mailto: or tel:');
      return;
    }
    if (target.kind === 'image') {
      target.element.setAttribute('src', address);
      target.element.setAttribute('alt', target.alt);
    } else {
      target.element.setAttribute('href', address);
    }
    setTarget(null);
    emit();
  };

  const uploadFor = async (file: File | undefined, use: (url: string, name: string) => void) => {
    if (!file) return;
    try {
      use(await upload(file), file.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Click any text to edit it · click a picture to change it · double-click a link to change where it goes
        </p>
        {templates?.canEdit && (
          <Button type="button" size="xs" variant="outline" onClick={() => setSaveOpen(true)}>
            <Save className="h-3.5 w-3.5" /> Save as new template
          </Button>
        )}
      </div>
      <iframe
        key={doc.version}
        ref={frameRef}
        title="Designed email"
        sandbox="allow-same-origin"
        srcDoc={doc.html}
        onLoad={handleLoad}
        style={{ height }}
        className="w-full rounded-lg border bg-white"
      />

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent showOverlay className="z-99999 max-w-md">
          <DialogHeader>
            <DialogTitle>{target?.kind === 'image' ? 'Change picture' : 'Change link'}</DialogTitle>
          </DialogHeader>
          {target?.kind === 'image' && (
            <div className="grid gap-3">
              {target.src && (
                <img src={target.src} alt="" className="bg-muted mx-auto max-h-40 rounded border object-contain" />
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => targetPictureInput.current?.click()}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload from computer
              </Button>
              <input
                ref={targetPictureInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void uploadFor(event.target.files?.[0], (url) => setTarget((value) => (value?.kind === 'image' ? { ...value, src: url } : value)));
                  event.target.value = '';
                }}
              />
              <div className="grid gap-1.5">
                <Label htmlFor="design-image-src">Or paste a picture address (URL)</Label>
                <Input
                  id="design-image-src"
                  value={target.src}
                  placeholder="https://…"
                  onChange={(e) => setTarget({ ...target, src: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="design-image-alt">Description (shown if the picture can't load)</Label>
                <Input
                  id="design-image-alt"
                  value={target.alt}
                  onChange={(e) => setTarget({ ...target, alt: e.target.value })}
                />
              </div>
            </div>
          )}
          {target?.kind === 'link' && (
            <div className="grid gap-1.5">
              <Label htmlFor="design-link-href">Link goes to</Label>
              <Input
                id="design-link-href"
                value={target.href}
                placeholder="https://…, mailto:… or tel:…"
                onChange={(e) => setTarget({ ...target, href: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={applyTarget} disabled={isUploading}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveAsTemplateDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        getHtml={() => current.current}
        suggestedName={templateName ? `${templateName} (edited)` : ''}
        subject={subject ?? ''}
        businesses={templates?.businesses ?? []}
        onSaved={() => queryClient.invalidateQueries({ queryKey: trpc.workspaceTemplates.list.queryKey() })}
      />
    </div>
  );
}

function SaveAsTemplateDialog({
  open,
  onOpenChange,
  getHtml,
  suggestedName,
  subject,
  businesses,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getHtml: () => string;
  suggestedName: string;
  subject: string;
  businesses: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [name, setName] = useState(suggestedName);
  const [businessId, setBusinessId] = useState<string>(ALL_BUSINESSES);
  const { mutateAsync: save, isPending } = useMutation(trpc.workspaceTemplates.saveFromEmail.mutationOptions());

  useEffect(() => {
    if (open) setName(suggestedName);
  }, [open, suggestedName]);

  const submit = async () => {
    try {
      await save({
        name: name.trim(),
        subject,
        businessId: businessId === ALL_BUSINESSES ? null : businessId,
        html: finalizeDesignedHtml(getHtml()),
      });
      toast.success('Saved as a new template');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showOverlay className="z-99999 max-w-md">
        <DialogHeader>
          <DialogTitle>Save as new template</DialogTitle>
          <DialogDescription>
            Everyone in your workspace can use it. The message area stays free for each new email.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-template-name">Template name</Label>
            <Input id="new-template-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-99999">
                <SelectItem value={ALL_BUSINESSES}>All businesses</SelectItem>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name.trim()}>
            {isPending ? 'Saving…' : 'Save template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
