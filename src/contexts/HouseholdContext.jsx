import { createContext, useContext, useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const HouseholdContext = createContext();

export function useHousehold() {
  return useContext(HouseholdContext);
}

export function HouseholdProvider({ children }) {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState(null);
  const [household, setHousehold] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // On auth change, look up or create the user's household
  useEffect(() => {
    if (!user) {
      setHouseholdId(null);
      setHousehold(null);
      setLoading(false);
      return;
    }

    async function initHousehold() {
      // Check if user already has a profile with a householdId
      const profileRef = doc(db, 'userProfiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists() && profileSnap.data().householdId) {
        const hId = profileSnap.data().householdId;
        setHouseholdId(hId);
      } else {
        // First time user — create a new household
        const householdRef = doc(collection(db, 'households'));
        const hId = householdRef.id;

        await setDoc(householdRef, {
          name: `${user.displayName || user.email}'s Household`,
          ownerId: user.uid,
          memberIds: [user.uid],
          createdAt: serverTimestamp(),
        });

        await setDoc(profileRef, {
          email: user.email,
          displayName: user.displayName || '',
          householdId: hId,
        });

        setHouseholdId(hId);
      }
      setLoading(false);
    }

    initHousehold();
  }, [user]);

  // Listen to household doc for real-time member changes
  useEffect(() => {
    if (!householdId) return;
    const unsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
      if (snap.exists()) {
        setHousehold({ id: snap.id, ...snap.data() });
      }
    });
    return unsub;
  }, [householdId]);

  // Listen for pending invitations for this user's email
  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, 'invitations'),
      where('invitedEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvitations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Invite someone by email
  async function inviteMember(email) {
    if (!householdId || !user) return;
    return addDoc(collection(db, 'invitations'), {
      householdId,
      householdName: household?.name || 'Household',
      invitedEmail: email.toLowerCase().trim(),
      invitedBy: user.displayName || user.email,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  }

  // Accept an invitation — join that household
  async function acceptInvitation(invitation) {
    // Update invitation status
    await updateDoc(doc(db, 'invitations', invitation.id), { status: 'accepted' });

    // Add user to household members
    await updateDoc(doc(db, 'households', invitation.householdId), {
      memberIds: arrayUnion(user.uid),
    });

    // Update user profile to point to new household
    await setDoc(doc(db, 'userProfiles', user.uid), {
      email: user.email,
      displayName: user.displayName || '',
      householdId: invitation.householdId,
    });

    setHouseholdId(invitation.householdId);
  }

  // Decline an invitation
  async function declineInvitation(invitation) {
    await updateDoc(doc(db, 'invitations', invitation.id), { status: 'declined' });
  }

  // Remove a member (owner only)
  async function removeMember(memberId) {
    if (!householdId || household?.ownerId !== user.uid) return;
    await updateDoc(doc(db, 'households', householdId), {
      memberIds: arrayRemove(memberId),
    });
    // Clear the removed user's household reference
    await updateDoc(doc(db, 'userProfiles', memberId), { householdId: null });
  }

  // Update household name
  async function updateHouseholdName(name) {
    if (!householdId) return;
    return updateDoc(doc(db, 'households', householdId), { name });
  }

  const value = {
    householdId,
    household,
    invitations,
    loading,
    inviteMember,
    acceptInvitation,
    declineInvitation,
    removeMember,
    updateHouseholdName,
    isOwner: household?.ownerId === user?.uid,
  };

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}
