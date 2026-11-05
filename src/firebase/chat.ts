import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
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

  // Look for an existing chat with exactly these participants
  const q = query(chatsRef, where('participants', '==', sorted));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const chatDoc = snapshot.docs[0];
    return chatDoc.id;
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
 * Listen to messages in a chat (real-time), newest first.
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as DocumentData),
    })) as Message[];
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
