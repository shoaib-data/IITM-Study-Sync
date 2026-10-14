import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ResourceItem } from '../types';
import { removeUndefinedFields } from './firestoreService';

/**
 * Validates that the URL starts with https:// and is a valid URL.
 * Rejects javascript:, http://, file:, data:, or any other schemes.
 */
export function validateResourceUrl(rawUrl: string): { isValid: boolean; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isValid: false, error: 'URL is required.' };
  }

  // Explicit check: must start with https://
  if (!trimmed.toLowerCase().startsWith('https://')) {
    return {
      isValid: false,
      error: 'URL must start with https:// (only secure HTTPS links are allowed).',
    };
  }

  // Reject malicious schemes that might try to evade startsWith
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid URL scheme.',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'URL protocol must be https:.',
      };
    }
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid, well-formed HTTPS URL (e.g., https://example.com).',
    };
  }

  return { isValid: true };
}

/**
 * Subscribes to the resources collection in real time, sorted by order ascending.
 */
export function subscribeResources(
  callback: (resources: ResourceItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'resources');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: ResourceItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          heading: data.heading || 'Untitled Resource',
          url: data.url || '',
          description: data.description || undefined,
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: data.createdAt || undefined,
        };
      });

      // Sort deterministically by order ascending, fallback to createdAt or id
      items.sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return (a.createdAt || a.id).localeCompare(b.createdAt || b.id);
      });

      callback(items);
    },
    (error) => {
      console.error('Error subscribing to resources:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Adds a new resource to the resources collection.
 */
export async function addResource(params: {
  heading: string;
  url: string;
  description?: string;
  currentResources: ResourceItem[];
}): Promise<string> {
  const heading = params.heading.trim();
  const url = params.url.trim();
  const description = params.description?.trim();

  if (!heading) {
    throw new Error('Heading is required.');
  }

  const val = validateResourceUrl(url);
  if (!val.isValid) {
    throw new Error(val.error || 'Invalid URL');
  }

  // Next order number
  const maxOrder =
    params.currentResources.length > 0
      ? Math.max(...params.currentResources.map((r) => r.order || 0))
      : 0;
  const newOrder = maxOrder + 1;

  const docData = removeUndefinedFields({
    heading,
    url,
    description: description || null,
    order: newOrder,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(db, 'resources'), docData);
  return docRef.id;
}

/**
 * Updates an existing resource in the resources collection.
 */
export async function updateResource(
  id: string,
  params: {
    heading: string;
    url: string;
    description?: string;
  }
): Promise<void> {
  const heading = params.heading.trim();
  const url = params.url.trim();
  const description = params.description?.trim();

  if (!heading) {
    throw new Error('Heading is required.');
  }

  const val = validateResourceUrl(url);
  if (!val.isValid) {
    throw new Error(val.error || 'Invalid URL');
  }

  const updates = removeUndefinedFields({
    heading,
    url,
    description: description || null,
    updatedAt: new Date().toISOString(),
  });

  await updateDoc(doc(db, 'resources', id), updates);
}

/**
 * Deletes a resource from the resources collection.
 */
export async function deleteResource(id: string): Promise<void> {
  await deleteDoc(doc(db, 'resources', id));
}

/**
 * Reorders resources when moving up or down.
 */
export async function moveResourceOrder(
  items: ResourceItem[],
  index: number,
  direction: 'up' | 'down'
): Promise<void> {
  if (direction === 'up' && index <= 0) return;
  if (direction === 'down' && index >= items.length - 1) return;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const reordered = [...items];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);

  // Batch update new order values
  const batch = writeBatch(db);
  reordered.forEach((item, idx) => {
    batch.update(doc(db, 'resources', item.id), { order: idx + 1 });
  });

  await batch.commit();
}
