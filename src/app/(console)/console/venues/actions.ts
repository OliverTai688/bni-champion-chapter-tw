'use server';

import { revalidatePath } from 'next/cache';
import { countSeats, isCrowded, readPlanObjects } from '@/lib/tbx/plan';
import { fail, intValue, isObjectId, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import {
  createLayoutFromTemplate,
  createSampleVenue,
  createVenue,
  deleteLayout,
  deleteVenue,
  duplicateLayout,
  parseObjectsPayload,
  renameLayout,
  saveLayoutObjects,
  updateVenue,
  validateVenueInput,
} from '@/server/tbx/venues';
import { requireLeader } from '@/server/tbx/viewer';

function refresh(venueId?: string) {
  revalidatePath('/console/venues');
  if (venueId) revalidatePath(`/console/venues/${venueId}`);
}

function readVenueForm(formData: FormData) {
  return validateVenueInput({
    name: text(formData, 'name'),
    address: optionalText(formData, 'address'),
    widthM: Number.parseFloat(text(formData, 'widthM')),
    heightM: Number.parseFloat(text(formData, 'heightM')),
    note: optionalText(formData, 'note'),
  });
}

function venueIdOf(formData: FormData) {
  const venueId = text(formData, 'venueId');
  if (!isObjectId(venueId)) throw new Error('場地編號不正確，請回到場地列表重新選擇。');
  return venueId;
}

function layoutIdOf(formData: FormData) {
  const layoutId = text(formData, 'layoutId');
  if (!isObjectId(layoutId)) throw new Error('配置編號不正確，請重新整理頁面後再試一次。');
  return layoutId;
}

export async function createVenueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const venue = await createVenue(readVenueForm(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_created',
      targetType: 'Venue',
      targetId: venue.id,
      metadata: { name: venue.name, widthM: venue.widthM, heightM: venue.heightM },
    });
    refresh();
    return ok(`已新增場地「${venue.name}」`);
  } catch (error) {
    return fail(error);
  }
}

export async function createSampleVenueAction(): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const venue = await createSampleVenue();
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_sample_created',
      targetType: 'Venue',
      targetId: venue.id,
    });
    refresh();
    return ok('已建立範例場地');
  } catch (error) {
    return fail(error);
  }
}

export async function updateVenueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const venueId = venueIdOf(formData);
    const venue = await updateVenue(venueId, readVenueForm(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_updated',
      targetType: 'Venue',
      targetId: venue.id,
      metadata: { name: venue.name, widthM: venue.widthM, heightM: venue.heightM },
    });
    refresh(venue.id);
    return ok('已儲存場地資料');
  } catch (error) {
    return fail(error);
  }
}

export async function deleteVenueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const venueId = venueIdOf(formData);
    const venue = await deleteVenue(venueId);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_deleted',
      targetType: 'Venue',
      targetId: venueId,
      metadata: { name: venue.name },
    });
    refresh(venueId);
    return ok(`已刪除場地「${venue.name}」`);
  } catch (error) {
    return fail(error);
  }
}

export async function createLayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const venueId = venueIdOf(formData);
    const layout = await createLayoutFromTemplate({
      venueId,
      name: text(formData, 'name'),
      kind: text(formData, 'kind'),
      seats: intValue(formData, 'seats', 0),
    });
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_layout_created',
      targetType: 'VenueLayout',
      targetId: layout.id,
      metadata: { venueId, name: layout.name, kind: layout.kind, seatCount: layout.seatCount },
    });
    refresh(venueId);
    const crowded = isCrowded(readPlanObjects(layout.objects));
    return ok(
      crowded
        ? `已建立配置「${layout.name}」，共 ${layout.seatCount} 個座位。這個場地排這麼多位會太擠，桌椅有重疊，請到編輯器調整，或刪除後改用較少的座位數。`
        : `已建立配置「${layout.name}」，共 ${layout.seatCount} 個座位`,
    );
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateLayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const layout = await duplicateLayout(layoutIdOf(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_layout_duplicated',
      targetType: 'VenueLayout',
      targetId: layout.id,
      metadata: { venueId: layout.venueId, name: layout.name },
    });
    refresh(layout.venueId);
    return ok(`已複製為「${layout.name}」`);
  } catch (error) {
    return fail(error);
  }
}

export async function renameLayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const layout = await renameLayout(layoutIdOf(formData), text(formData, 'name'));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_layout_renamed',
      targetType: 'VenueLayout',
      targetId: layout.id,
      metadata: { name: layout.name },
    });
    refresh(layout.venueId);
    return ok('已改名');
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const layout = await deleteLayout(layoutIdOf(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_layout_deleted',
      targetType: 'VenueLayout',
      targetId: layout.id,
      metadata: { venueId: layout.venueId, name: layout.name },
    });
    refresh(layout.venueId);
    return ok(`已刪除配置「${layout.name}」`);
  } catch (error) {
    return fail(error);
  }
}

/** Saves the objects drawn in the layout editor. The JSON shape is validated on the server. */
export async function saveLayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const layoutId = layoutIdOf(formData);
    const objects = parseObjectsPayload(text(formData, 'objects'));
    const layout = await saveLayoutObjects(layoutId, objects);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'venue_layout_saved',
      targetType: 'VenueLayout',
      targetId: layout.id,
      metadata: { objects: objects.length, seatCount: countSeats(objects) },
    });
    refresh(layout.venueId);
    return ok(`已儲存配置，共 ${layout.seatCount} 個座位`);
  } catch (error) {
    return fail(error);
  }
}
