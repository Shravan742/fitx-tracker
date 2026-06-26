import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '../types';
import { getProfile } from './firestoreDb';
import {
  getMyOutgoingInvite,
  getMyIncomingInvite,
  getPartnerUid,
  sendInvite as sendInviteApi,
  cancelInvite as cancelInviteApi,
  acceptInvite as acceptInviteApi,
  declineInvite as declineInviteApi,
  type Invite,
} from './invites';

export function usePartner(uid: string | undefined, email: string | undefined) {
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [outgoing, setOutgoing] = useState<Invite | null>(null);
  const [incoming, setIncoming] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid || !email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pUid, out, inc] = await Promise.all([
      getPartnerUid(uid, email),
      getMyOutgoingInvite(uid),
      getMyIncomingInvite(email),
    ]);
    setPartnerUid(pUid);
    setOutgoing(out?.status === 'pending' ? out : null);
    setIncoming(inc);
    setPartnerProfile(pUid ? (await getProfile(pUid)) ?? null : null);
    setLoading(false);
  }, [uid, email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendInvite = async (toEmail: string) => {
    if (!uid || !email) return;
    await sendInviteApi(uid, email, toEmail);
    await refresh();
  };
  const cancelInvite = async () => {
    if (!uid) return;
    await cancelInviteApi(uid);
    await refresh();
  };
  const accept = async (inviteId: string) => {
    if (!uid) return;
    await acceptInviteApi(inviteId, uid);
    await refresh();
  };
  const decline = async (inviteId: string) => {
    await declineInviteApi(inviteId);
    await refresh();
  };

  return { partnerUid, partnerProfile, outgoing, incoming, loading, refresh, sendInvite, cancelInvite, accept, decline };
}
