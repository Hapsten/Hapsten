import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from '@/firebase/config';

export type Chat = {
  id: string;
  eventId?: string;
  participants: string[];
  activityTitle?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt?: any;
  updatedAt?: any;
  /** Map of uid -> Timestamp of the last message the user has seen. */
  lastReadAt?: Record<string, any>;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  createdAt: any;
  /** Client clock used for stable ordering while server timestamps resolve. */
  clientCreatedAt?: number;
  readBy: string[];
};

/**
 * Sends a message and updates the chat preview. The chat document must already
 * exist (it is created together with the event).
 */
export async function sendMessage({
  chatId,
  content,
  senderId,
  messageType = 'text',
}: {
  chatId: string;
  content: string;
  senderId: string;
  messageType?: 'text' | 'image' | 'system';
}): Promise<string> {
  const now = serverTimestamp();
  const batch = writeBatch(db);

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const msgRef = doc(messagesRef);
  batch.set(msgRef, {
    id: msgRef.id,
    chatId,
    senderId,
    content,
    messageType,
    createdAt: now,
    clientCreatedAt: Date.now(),
    readBy: [senderId],
  });

  batch.set(
    doc(db, 'chats', chatId),
    { lastMessage: content, lastMessageAt: now, updatedAt: now },
    { merge: true },
  );

  await batch.commit();
  return msgRef.id;
}

/** Chats where the current user is a participant. */
export function subscribeToChats(
  userId: string,
  callback: (chats: Chat[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('participants', 'array-contains', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const chats: Chat[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as DocumentData),
      })) as Chat[];

      chats.sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate?.() ?? new Date(0);
        const bTime = b.lastMessageAt?.toDate?.() ?? new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      callback(chats);
    },
    (error) => onError?.(error),
  );
}

export function subscribeToChat(
  chatId: string,
  callback: (chat: Chat | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'chats', chatId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...(snapshot.data() as DocumentData) } as Chat);
    },
    (error) => onError?.(error),
  );
}

/**
 * Messages ordered by server timestamp. `clientCreatedAt` is kept for
 * potential local sorting but is not used in the query, because a query
 * ordered by a missing field would silently drop matchmaker messages.
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(300));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as DocumentData),
      })) as Message[];
      callback(messages);
    },
    (error) => onError?.(error),
  );
}

/**
 * Stores one timestamp per user instead of rewriting every message.
 */
export async function markChatRead(chatId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'chats', chatId), {
    [`lastReadAt.${userId}`]: serverTimestamp(),
  });
}

/** Get user display info from auth user object. */
export function getUserDisplay(user: User | null) {
  return {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    photoURL: user?.photoURL || null,
    id: user?.uid || '',
  };
}
