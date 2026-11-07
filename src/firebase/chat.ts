import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  updateDoc,
} from 'firebase/firestore';
import { DocumentData } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { User } from 'firebase/auth';

export type Chat = {
  id: string;
  participants: string[];
  activityId?: string;
  activityTitle?: string;
  lastMessage?: string;
  lastMessageAt: any;
  createdAt: any;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  createdAt: any;
  readBy: string[];
};

/**
 * Get or create a 1:1 chat between two users for a specific activity.
 */
export async function getOrCreateChat(
  participantIds: string[],
  options?: { activityId?: string; activityTitle?: string }
): Promise<string> {
  const sorted = [...participantIds].sort();
  const chatsRef = collection(db, 'chats');

  // Build query: by activityId if provided (different events = different chats),
  // otherwise by exact participants match
  let q;
  if (options?.activityId) {
    q = query(chatsRef, where('activityId', '==', options.activityId));
  } else {
    q = query(chatsRef, where('participants', '==', sorted));
  }

  const snapshot = await getDocs(q);

  // Find exact participant match among results
  const matchingDoc = snapshot.docs.find((doc) => {
    const data = doc.data() as any;
    const docParticipants = [...data.participants].sort();
    return JSON.stringify(docParticipants) === JSON.stringify(sorted);
  });

  if (matchingDoc) {
    // If user is joining an existing chat and not yet a participant, add them
    const docData = matchingDoc.data() as any;
    const currentParticipants = docData.participants || [];
    if (!currentParticipants.includes(participantIds[participantIds.length - 1])) {
      await updateDoc(matchingDoc.ref, {
        participants: arrayUnion(participantIds[participantIds.length - 1]),
      });
    }
    return matchingDoc.id;
  }

  // Create new chat
  const now = serverTimestamp();
  const chatData: Partial<Chat> = {
    participants: sorted,
    lastMessageAt: now,
    createdAt: now,
    ...(options?.activityId ? { activityId: options.activityId } : {}),
    ...(options?.activityTitle ? { activityTitle: options.activityTitle } : {}),
  };

  const docRef = await addDoc(chatsRef, chatData);
  return docRef.id;
}

/**
 * Send a message in a chat.
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

  // Create the message
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const msgRef = doc(messagesRef);
  batch.set(msgRef, {
    id: msgRef.id,
    chatId,
    senderId,
    content,
    messageType,
    createdAt: now,
    readBy: [senderId],
  });

  // Update the chat's last message
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: content,
    lastMessageAt: now,
  });

  await batch.commit();
  return msgRef.id;
}

/**
 * Listen to chats for a user (real-time).
 */
export function subscribeToChats(
  userId: string,
  callback: (chats: Chat[]) => void
) {
  const chatsRef = collection(db, 'chats');
  // Query without orderBy to avoid needing a composite index;
  // sorting is done client-side below.
  const q = query(chatsRef, where('participants', 'array-contains', userId));

  return onSnapshot(q, (snapshot) => {
    const chats: Chat[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as DocumentData),
    })) as Chat[];
    // Sort client-side by lastMessageAt descending
    chats.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate?.() ?? new Date(0);
      const bTime = b.lastMessageAt?.toDate?.() ?? new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    callback(chats);
  });
}

/**
 * Listen to all event chats (chats that have an activityId).
 * Used so other users can discover and join events.
 */
export function subscribeToEventChats(callback: (chats: Chat[]) => void) {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('activityId', '!=', null));

  return onSnapshot(q, (snapshot) => {
    const chats: Chat[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as DocumentData),
    })) as Chat[];
    chats.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate?.() ?? new Date(0);
      const bTime = b.lastMessageAt?.toDate?.() ?? new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    callback(chats);
  });
}

/**
 * Listen to messages in a chat (real-time), newest first.
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  // Query without orderBy to avoid needing a composite index;
  // sorting is done client-side below.
  const q = query(messagesRef);

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as DocumentData),
    })) as Message[];
    // Sort client-side by createdAt ascending
    messages.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() ?? new Date(0);
      const bTime = b.createdAt?.toDate?.() ?? new Date(0);
      return aTime.getTime() - bTime.getTime();
    });
    callback(messages);
  });
}

/**
 * Mark messages as read by the current user.
 */
export async function markMessagesAsRead(chatId: string, userId: string) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  // Fetch all messages and mark unread ones as read
  const snapshot = await getDocs(messagesRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data() as DocumentData;
    if (!data.readBy || !data.readBy.includes(userId)) {
      batch.update(docSnap.ref, { readBy: arrayUnion(userId) });
    }
  });
  await batch.commit();
}

/**
 * Get user display info from auth user object.
 */
export function getUserDisplay(user: User | null) {
  return {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    photoURL: user?.photoURL || null,
    id: user?.uid || '',
  };
}
