import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { Users, Mail, Crown, Trash2, Check, X, Edit2, Send } from 'lucide-react';
import { cn } from '../lib/utils';

export default function HouseholdSettings() {
  const { user } = useAuth();
  const {
    household,
    invitations,
    loading,
    inviteMember,
    acceptInvitation,
    declineInvitation,
    removeMember,
    updateHouseholdName,
    isOwner,
  } = useHousehold();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [message, setMessage] = useState(null);

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      await inviteMember(email);
      setMessage({ type: 'success', text: `Invitation sent to ${email}` });
      setEmail('');
    } catch {
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    }
    setSending(false);
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    await updateHouseholdName(nameInput.trim());
    setEditingName(false);
  }

  async function handleRemove(memberId) {
    if (!confirm('Remove this member from the household?')) return;
    await removeMember(memberId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Household Settings
      </h1>

      {/* Pending Invitations for Current User */}
      {invitations.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Invitations
          </h2>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-100 dark:border-amber-800"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {inv.householdName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Invited by {inv.invitedBy}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptInvitation(inv)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition"
                >
                  <Check className="w-4 h-4" /> Accept
                </button>
                <button
                  onClick={() => declineInvitation(inv)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition"
                >
                  <X className="w-4 h-4" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Household Name */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Household
          </h2>
          {isOwner && !editingName && (
            <button
              onClick={() => {
                setNameInput(household?.name || '');
                setEditingName(true);
              }}
              className="text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {editingName ? (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition"
            >
              Save
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            {household?.name || 'My Household'}
          </p>
        )}

        {/* Members List */}
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Members ({household?.memberIds?.length || 0})
        </h3>
        <div className="space-y-2">
          {household?.memberIds?.map((memberId) => (
            <div
              key={memberId}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {memberId === user.uid ? `${user.displayName || user.email} (You)` : memberId}
                  </p>
                </div>
                {memberId === household?.ownerId && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> Owner
                  </span>
                )}
              </div>
              {isOwner && memberId !== user.uid && (
                <button
                  onClick={() => handleRemove(memberId)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-emerald-600" />
            Invite a Member
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Send an invitation by email. They'll see it when they log in.
          </p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={sending}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium text-white transition',
                sending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {sending ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
          {message && (
            <p
              className={cn(
                'mt-3 text-sm',
                message.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <strong>How household sharing works:</strong> All members of a household
        share the same income, expenses, budget, vacation, and debt data. The
        household owner can invite or remove members.
      </div>
    </div>
  );
}
