export type PublicEventPublishAction = 'generate_slug' | 'publish' | 'hide' | 'archive';

export interface AdminEventPublicationDTO {
  weekId: string;
  title: string;
  publicSlug: string | null;
  publicUrl: string | null;
  publicStatus: string;
  updatedAt: string;
}

export function normalizePublishAction(value: unknown): PublicEventPublishAction {
  if (value === 'generate_slug' || value === 'publish' || value === 'hide' || value === 'archive') {
    return value;
  }

  throw new Error('Unsupported publication action.');
}
