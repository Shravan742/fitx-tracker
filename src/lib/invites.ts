import { deleteDoc, doc, getDoc, getDocs, collection, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from './firebase';

/**
 * Each sender can have at most one active invite, keyed by their own uid as the doc
 * ID. This makes "is X my accepted partner" checkable with a deterministic get() in
 * both app code and Firestore security rules, without needing a Cloud Function (which
 * would require Firebase's paid Blaze plan) to write a mutual link across two users'
 * separate profile docs.
 */
export interface Invite {
  id: string; // == fromUid
  fromUid: string;
  fromEmail: string;
  toEmail: string;
  toUid?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export async function sendInvite(fromUid: string, fromEmail: string, toEmail: string): Promise<void> {
  const clean = toEmail.trim().toLowerCase();
  if (clean === fromEmail.trim().toLowerCase()) throw new Error("You can't invite yourself.");
  await setDoc(doc(firestore, 'invites', fromUid), {
    fromUid,
    fromEmail,
    toEmail: clean,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function cancelInvite(fromUid: string): Promise<void> {
  await deleteDoc(doc(firestore, 'invites', fromUid));
}

export async function getMyOutgoingInvite(uid: string): Promise<Invite | null> {
  const snap = await getDoc(doc(firestore, 'invites', uid));
  return snap.exists() ? ({ ...(snap.data() as Omit<Invite, 'id'>), id: snap.id }) : null;
}

export async function getMyIncomingInvite(email: string): Promise<Invite | null> {
  const q = query(
    collection(firestore, 'invites'),
    where('toEmail', '==', email.trim().toLowerCase()),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  const d = snap.docs[0];
  return d ? { ...(d.data() as Omit<Invite, 'id'>), id: d.id } : null;
}

export async function acceptInvite(inviteId: string, myUid: string): Promise<void> {
  await updateDoc(doc(firestore, 'invites', inviteId), { status: 'accepted', toUid: myUid });
}

export async function declineInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(firestore, 'invites', inviteId), { status: 'declined' });
}

/** Resolves the signed-in user's linked partner uid, whichever side of the invite they were on. */
export async function getPartnerUid(uid: string, email: string): Promise<string | null> {
  const outgoing = await getMyOutgoingInvite(uid);
  if (outgoing?.status === 'accepted' && outgoing.toUid) return outgoing.toUid;

  const q = query(
    collection(firestore, 'invites'),
    where('toEmail', '==', email.trim().toLowerCase()),
    where('status', '==', 'accepted'),
  );
  const snap = await getDocs(q);
  const accepted = snap.docs[0];
  return accepted ? (accepted.data() as Invite).fromUid : null;
}
