import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ImageIcon, LayoutTemplate, Loader2, Pencil, Plus, Sparkles, Trash2, Undo2, Upload } from 'lucide-react';
import { useImageUpload } from '@/hooks/use-image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceTemplates } from '@/hooks/use-workspace-templates';
import { SettingsCard } from '@/components/settings/settings-card';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTRPC } from '@/providers/query-provider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type FieldType = 'text' | 'textarea' | 'image' | 'url' | 'color';
type Field = { key: string; label: string; type: FieldType; value: string };
type Draft = {
  id?: string;
  name: string;
  description: string;
  subject: string;
  businessId: string | null;
  html: string;
  fields: Field[];
};

const ALL_BUSINESSES = 'all';
const SAMPLE_MESSAGE =
  '<p>Hello,</p><p>This is where the message you write in the composer appears.</p><p>Best regards</p>';

/** A neutral starting layout; every text, image and colour is an editable field. */
const STARTER: Draft = {
  name: '',
  description: '',
  subject: '',
  businessId: null,
  html: `<!doctype html><html><body style="margin:0;padding:0;background:{{page_color}};font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff">
<tr><td style="padding:20px 32px;background:{{header_color}}"><img src="{{header_logo}}" alt="{{company_name}}" width="140" style="display:block;border:0;color:#ffffff"></td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#333333">{{content}}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;font-size:11px;color:#888888">{{footer_text}}</td></tr>
</table></td></tr></table></body></html>`,
  fields: [],
};

export default function EmailTemplatesPage() {
  const { data, isLoading, refetch } = useWorkspaceTemplates();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const { mutateAsync: loadTemplate } = useMutation({
    mutationFn: (id: string) => queryClient.fetchQuery(trpc.workspaceTemplates.get.queryOptions({ id })),
  });
  const { mutateAsync: deleteTemplate } = useMutation(trpc.workspaceTemplates.delete.mutationOptions());

  const open = async (id: string, copy = false) => {
    try {
      const template = await loadTemplate(id);
      setDraft({
        id: copy ? undefined : template.id,
        name: copy ? `${template.name} (copy)` : template.name,
        description: template.description,
        subject: template.subject,
        businessId: template.businessId,
        html: template.html,
        fields: template.fields as Field[],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open this template');
    }
  };

  const remove = async (id: string) => {
    setPendingDelete(null);
    await toast.promise(deleteTemplate({ id }), {
      loading: 'Deleting template…',
      success: 'Template deleted',
      error: (error) => (error instanceof Error ? error.message : 'Could not delete the template'),
    });
    await refetch();
  };

  if (draft) {
    return (
      <TemplateEditor
        draft={draft}
        businesses={data?.businesses ?? []}
        onClose={async () => {
          setDraft(null);
          await refetch();
        }}
      />
    );
  }

  const templates = data?.templates ?? [];
  return (
    <div className="grid gap-6">
      <SettingsCard
        title="Email templates"
        description="Designed layouts your whole workspace can send emails in. Write the message as usual, then pick a design in the composer."
        action={
          data?.canEdit ? (
            <Button size="sm" onClick={() => setDraft({ ...STARTER })}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading templates…</p>
        ) : !templates.length ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <LayoutTemplate className="text-muted-foreground h-8 w-8" />
            <p className="font-medium">No templates yet</p>
            <p className="text-muted-foreground text-sm">Create one to send branded emails from any mailbox.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="bg-background flex flex-col gap-3 rounded-xl border p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{template.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {template.businessName ?? 'All businesses'} · Updated{' '}
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                  {template.description && (
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{template.description}</p>
                  )}
                </div>
                {data?.canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => open(template.id)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => open(template.id, true)}>
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      aria-label={`Delete ${template.name}`}
                      onClick={() => setPendingDelete({ id: template.id, name: template.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent showOverlay className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this template?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name}” will be removed for everyone in the workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => pendingDelete && void remove(pendingDelete.id)}>
              Delete template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateEditor({
  draft: initial,
  businesses,
  onClose,
}: {
  draft: Draft;
  businesses: { id: string; name: string }[];
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const [draft, setDraft] = useState<Draft>(initial);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState('');
  const { mutateAsync: preview } = useMutation(trpc.workspaceTemplates.preview.mutationOptions());
  const { mutateAsync: create, isPending: creating } = useMutation(trpc.workspaceTemplates.create.mutationOptions());
  const { mutateAsync: update, isPending: updating } = useMutation(trpc.workspaceTemplates.update.mutationOptions());
  const request = useRef(0);
  const [instruction, setInstruction] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiHistory, setAiHistory] = useState<Draft[]>([]);
  const { mutateAsync: editDesign, isPending: isEditing } = useMutation(trpc.ai.editDesign.mutationOptions());

  const askAi = async () => {
    if (instruction.trim().length < 2) return;
    try {
      const result = await editDesign({ mode: 'template', instruction: instruction.trim(), html: draft.html, fields: draft.fields });
      setAiHistory((items) => [...items, draft].slice(-20));
      const values = new Map((result.fields ?? []).map((field) => [field.key, field.value]));
      setDraft((current) => ({
        ...current,
        html: result.html,
        fields: current.fields.map((field) => (values.has(field.key) ? { ...field, value: values.get(field.key)! } : field)),
      }));
      setAiSummary(result.summary);
      setInstruction('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The AI could not apply this change');
    }
  };

  const undoAi = () => {
    const previous = aiHistory.at(-1);
    if (!previous) return;
    setAiHistory((items) => items.slice(0, -1));
    setDraft(previous);
    setAiSummary('');
  };

  const update_ = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const setField = (key: string, value: string) =>
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.key === key ? { ...field, value } : field)),
    }));

  // Live preview; the server also reports the fields the layout's placeholders define.
  const previewInput = useMemo(
    () => JSON.stringify({ html: draft.html, fields: draft.fields, subject: draft.subject }),
    [draft.html, draft.fields, draft.subject],
  );
  useEffect(() => {
    const id = ++request.current;
    const timer = window.setTimeout(async () => {
      try {
        const result = await preview({ ...JSON.parse(previewInput), content: SAMPLE_MESSAGE });
        if (id !== request.current) return;
        setPreviewHtml(result.html);
        setPreviewError('');
        const keys = (fields: { key: string }[]) => fields.map((field) => field.key).join('|');
        setDraft((current) =>
          keys(current.fields) === keys(result.fields)
            ? current
            : {
                ...current,
                fields: result.fields.map(
                  (field) => current.fields.find((existing) => existing.key === field.key) ?? (field as Field),
                ),
              },
        );
      } catch (error) {
        if (id === request.current) setPreviewError(error instanceof Error ? error.message : 'Preview failed');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [previewInput, preview]);

  const save = async () => {
    const payload = {
      name: draft.name.trim(),
      description: draft.description,
      subject: draft.subject,
      businessId: draft.businessId,
      html: draft.html,
      fields: draft.fields,
    };
    try {
      if (draft.id) await update({ id: draft.id, ...payload });
      else await create(payload);
      toast.success('Template saved');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the template');
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{draft.id ? 'Edit template' : 'New template'}</h2>
          <p className="text-muted-foreground text-sm">
            Change any text, picture, link or colour. Add a <code>{'{{placeholder}}'}</code> in the HTML to make a
            new editable field; <code>{'{{content}}'}</code> is where the message goes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={creating || updating || !draft.name.trim()}>
            Save template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="bg-background grid content-start gap-4 rounded-xl border p-4">
          <div className="grid gap-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input id="template-name" value={draft.name} onChange={(e) => update_({ name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Business</Label>
            <Select
              value={draft.businessId ?? ALL_BUSINESSES}
              onValueChange={(value) => update_({ businessId: value === ALL_BUSINESSES ? null : value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BUSINESSES}>All businesses</SelectItem>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="template-subject">Default subject (optional)</Label>
            <Input
              id="template-subject"
              value={draft.subject}
              onChange={(e) => update_({ subject: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Input
              id="template-description"
              value={draft.description}
              onChange={(e) => update_({ description: e.target.value })}
            />
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-violet-500" /> Ask AI to change this template
              </span>
              {aiHistory.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={undoAi} disabled={isEditing}>
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
              )}
            </div>
            {aiSummary && <p className="mb-2 text-xs text-violet-900 dark:text-violet-200">{aiSummary} Save the template to keep it.</p>}
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void askAi();
                }
              }}
              placeholder="e.g. “add a second button to book a call”, “make the header white with a dark logo”, “rewrite the intro for existing clients”"
              className="min-h-[64px] resize-none bg-white text-sm dark:bg-transparent"
              disabled={isEditing}
            />
            <div className="mt-2 flex justify-end">
              <Button type="button" size="sm" onClick={askAi} disabled={isEditing || instruction.trim().length < 2}>
                {isEditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isEditing ? 'Applying…' : 'Apply change'}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="content">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">
                Texts & pictures
              </TabsTrigger>
              <TabsTrigger value="html" className="flex-1">
                HTML layout
              </TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="grid gap-4 pt-2">
              {!draft.fields.length && (
                <p className="text-muted-foreground text-sm">This layout has no editable fields yet.</p>
              )}
              {draft.fields.map((field) => (
                <FieldInput key={field.key} field={field} onChange={(value) => setField(field.key, value)} />
              ))}
            </TabsContent>
            <TabsContent value="html" className="pt-2">
              <Textarea
                aria-label="Template HTML"
                spellCheck={false}
                value={draft.html}
                onChange={(e) => update_({ html: e.target.value })}
                className="min-h-[420px] font-mono text-xs"
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-background flex min-h-[640px] flex-col overflow-hidden rounded-xl border">
          <div className="text-muted-foreground border-b px-4 py-2 text-xs">
            Preview with a sample message
          </div>
          {previewError ? (
            <p className="text-destructive p-4 text-sm">{previewError}</p>
          ) : (
            <iframe title="Template preview" sandbox="" srcDoc={previewHtml} className="w-full flex-1 bg-white" />
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, onChange }: { field: Field; onChange: (value: string) => void }) {
  const id = `field-${field.key}`;
  const { upload, isUploading } = useImageUpload();
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === 'textarea' ? (
        <Textarea id={id} value={field.value} onChange={(e) => onChange(e.target.value)} className="min-h-[90px]" />
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${field.label} colour`}
            value={/^#[0-9a-f]{6}$/i.test(field.value) ? field.value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <Input id={id} value={field.value} placeholder="#000000" onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : field.type === 'image' ? (
        <div className="flex items-center gap-2">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border">
            {field.value ? (
              <img src={field.value} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="text-muted-foreground h-4 w-4" />
            )}
          </div>
          <Input id={id} value={field.value} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInput.current?.click()}
            aria-label={`Upload ${field.label}`}
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                onChange(await upload(file));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Upload failed');
              }
            }}
          />
        </div>
      ) : (
        <Input
          id={id}
          value={field.value}
          placeholder={field.type === 'url' ? 'https://…, mailto:… or tel:…' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
