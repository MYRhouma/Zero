import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceTemplates } from '@/hooks/use-workspace-templates';
import { Check, LayoutTemplate, Settings2 } from 'lucide-react';
import { useTRPC } from '@/providers/query-provider';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

const EMPTY_MESSAGE = '<p>Write your message here.</p>';

interface TemplatesButtonProps {
  /** The template currently placed in the message, if any. */
  value: string | null;
  /** Called with the complete email to edit, or null to go back to a plain email. */
  onApply: (template: { id: string; name: string; html: string; subject: string } | null) => void;
  /** The message written so far; it is placed inside the chosen template. */
  getContent: () => string;
  subject: string;
}

/** Place one of the workspace's email templates in the message body. */
export function TemplatesButton({ value, onApply, getContent, subject }: TemplatesButtonProps) {
  const { data, isError } = useWorkspaceTemplates();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { mutateAsync: render, isPending } = useMutation(trpc.workspaceTemplates.preview.mutationOptions());

  const templates = data?.templates ?? [];
  if (isError || (!templates.length && !data?.canEdit)) return null;
  const selected = templates.find((template) => template.id === value);

  const choose = async (id: string, name: string, templateSubject: string) => {
    try {
      const written = getContent();
      const hasText = written.replace(/<[^>]*>/g, '').trim().length > 0;
      const result = await render({ templateId: id, content: hasText ? written : EMPTY_MESSAGE, subject });
      onApply({ id, name, html: result.html, subject: templateSubject });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open this template');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          disabled={isPending}
          className="bg-background max-w-[200px] cursor-pointer border transition-colors hover:bg-gray-50 dark:hover:bg-[#404040]"
          aria-label="Email templates"
        >
          <LayoutTemplate className="h-3 w-3 text-[#9A9A9A]" />
          <span className="hidden truncate px-0.5 text-sm md:block">{selected ? selected.name : 'Templates'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="z-99999 w-64">
        <DropdownMenuLabel>Email templates</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onApply(null)}>
          <Check className={value ? 'invisible h-4 w-4' : 'h-4 w-4'} />
          Plain email
        </DropdownMenuItem>
        {templates.map((template) => (
          <DropdownMenuItem key={template.id} onClick={() => choose(template.id, template.name, template.subject)}>
            <Check className={value === template.id ? 'h-4 w-4' : 'invisible h-4 w-4'} />
            <div className="min-w-0">
              <div className="truncate">{template.name}</div>
              {template.businessName && (
                <div className="text-muted-foreground truncate text-xs">{template.businessName}</div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {!templates.length && (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">No templates in this workspace yet.</p>
        )}
        {data?.canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings/email-templates')}>
              <Settings2 className="h-4 w-4" />
              Manage templates
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
