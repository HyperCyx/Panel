'use client';

import { useState } from 'react';
import { getCurrentUser, updateUserProfile } from '@/app/actions';
import {
  User, Mail, Wallet, Zap, BadgeCheck, Pencil, Loader2,
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-provider';

interface ProfileViewProps {
  user: UserProfile;
  walletBalance: number;
  otpRate: number;
}

export function ProfileView({ user, walletBalance, otpRate }: ProfileViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(user.name ?? '');
  const [editEmail, setEditEmail] = useState(user.email ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { currency } = useSettings();

  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    setIsUpdating(true);
    const result = await updateUserProfile(user.id, { name: editName, email: editEmail });
    setIsUpdating(false);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    } else {
      toast({ title: 'Profile Updated', description: 'Your details have been saved.' });
      setEditOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary uppercase tracking-widest">
        <User className="h-4 w-4" />
        My Profile
      </h2>
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-extrabold text-4xl select-none shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)] ring-4 ring-background/50">
            {initials}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{user.name || '—'}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md mt-1">
                <BadgeCheck className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1 border-t border-border/30 pt-6 relative z-10">
          {[
            { icon: <User className="h-3.5 w-3.5" />, label: 'Name',    value: user.name || '—' },
            { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email',   value: user.email },
            { icon: <Wallet className="h-3.5 w-3.5" />, label: 'Balance', value: <span className="font-bold text-emerald-600">{currency} {walletBalance.toFixed(2)}</span> },
            { icon: <Zap className="h-3.5 w-3.5" />,  label: 'OTP Rate', value: <span className="font-bold text-amber-600">{currency} {otpRate.toFixed(2)}</span> },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2.5">
                {icon} {label}
              </span>
              <span className="text-sm font-semibold text-foreground">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-muted/50 transition-colors">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2.5">
              <BadgeCheck className="h-3.5 w-3.5" /> Status
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {user.status ?? 'active'}
            </span>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={() => { setEditName(user.name ?? ''); setEditEmail(user.email ?? ''); setEditOpen(true); }}
          className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] relative z-10"
        >
          <Pencil className="h-4 w-4" />
          Edit Details
        </button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Email</label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Your email" />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating || !editName.trim() || !editEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-colors"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
