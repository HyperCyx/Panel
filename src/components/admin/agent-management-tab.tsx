'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { createAgent, getAllAgents, deleteAgent, updateAgent, updateAgentPassword } from '@/app/actions';
import { Loader2, Plus, Trash2, UserCheck, RefreshCcw, Pencil, Eye, EyeOff, KeyRound, Link2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';

const agentFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  commissionRate: z.coerce.number().min(0).max(100, { message: 'Must be 0-100%.' }),
  channelLink: z.string().url({ message: 'Must be a valid URL (include https://)' }).optional().or(z.literal('')),
});

const editAgentSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  commissionRate: z.coerce.number().min(0).max(100, { message: 'Must be 0-100%.' }),
  channelLink: z.string().url({ message: 'Must be a valid URL (include https://)' }).optional().or(z.literal('')),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }).optional().or(z.literal('')),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;
type EditAgentValues = z.infer<typeof editAgentSchema>;

export function AgentManagementTab() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit Agent modal
  const [editAgent, setEditAgent] = useState<UserProfile | null>(null);

  // Password change modal
  const [pwAgent, setPwAgent] = useState<UserProfile | null>(null);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Create form password visibility
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema) as any,
    defaultValues: { name: '', email: '', password: '', commissionRate: 10, channelLink: '' },
  });

  const editForm = useForm<EditAgentValues>({
    resolver: zodResolver(editAgentSchema) as any,
    defaultValues: { name: '', email: '', commissionRate: 10, channelLink: '', password: '' },
  });

  const fetchAgents = async () => {
    setLoading(true);
    const result = await getAllAgents();
    if (result.agents) setAgents(result.agents);
    else if (result.error) toast({ variant: 'destructive', title: 'Error', description: result.error });
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  useEffect(() => {
    if (editAgent) {
      editForm.reset({
        name: editAgent.name || '',
        email: editAgent.email || '',
        commissionRate: editAgent.commissionRate || 0,
        channelLink: editAgent.channelLink || '',
        password: '',
      });
    }
  }, [editAgent, editForm]);

  async function onSubmit(values: AgentFormValues) {
    setCreating(true);
    const result = await createAgent(values);
    if (result.success) {
      toast({ title: 'Agent Created', description: `Agent ${values.email} has been created.` });
      form.reset();
      fetchAgents();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setCreating(false);
  }

  async function onEditSubmit(values: EditAgentValues) {
    if (!editAgent) return;
    setUpdating(true);
    const result = await updateAgent(editAgent.id, values);
    if (result.success) {
      toast({ title: 'Agent Updated', description: `Agent details for ${values.email} updated.` });
      setEditAgent(null);
      fetchAgents();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setUpdating(false);
  }

  async function handleDelete(agentId: string) {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    setDeletingId(agentId);
    const result = await deleteAgent(agentId);
    if (result.success) {
      toast({ title: 'Agent Deleted' });
      fetchAgents();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setDeletingId(null);
  }

  async function handleSavePassword() {
    if (!pwAgent) return;
    if (newPw.length < 8) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Minimum 8 characters.' });
      return;
    }
    setSavingPw(true);
    const result = await updateAgentPassword(pwAgent.id, newPw);
    if (result.success) {
      toast({ title: 'Password Updated', description: `Password changed for ${pwAgent.name}.` });
      setPwAgent(null);
      setNewPw('');
      setShowPw(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setSavingPw(false);
  }

  return (
    <div className="space-y-6">
      {/* Create Agent */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create New Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Agent Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Email</FormLabel>
                      <FormControl>
                        <Input placeholder="agent@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCreatePw ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreatePw(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCreatePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.1" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="channelLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Channel / Group Link <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://t.me/yourchannel" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Telegram, WhatsApp group, or any link for this agent's channel.</p>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Agent
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            All Agents
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : agents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No agents created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email / Channel</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{agent.email}</p>
                          {agent.channelLink && (
                            <a
                              href={agent.channelLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[180px]"
                            >
                              <Link2 className="h-3 w-3 flex-shrink-0" />
                              {agent.channelLink}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{agent.commissionRate ?? 0}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                            {agent.plainPassword || '••••••••'}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>{(agent.agentWalletBalance ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          agent.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {agent.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit Agent"
                            onClick={() => setEditAgent(agent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Change Password"
                            onClick={() => { setPwAgent(agent); setNewPw(''); setShowPw(false); }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(agent.id)}
                            disabled={deletingId === agent.id}
                          >
                            {deletingId === agent.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Agent Modal */}
      <Dialog open={!!editAgent} onOpenChange={(open) => { if (!open) setEditAgent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Agent Details
            </DialogTitle>
            <DialogDescription>
              Update the profile and settings for {editAgent?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="channelLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel / Group Link</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showEditPw ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPw(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showEditPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={updating}>
                  {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={!!pwAgent} onOpenChange={(open) => { if (!open) { setPwAgent(null); setNewPw(''); setShowPw(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new login password for {pwAgent?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Password</label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSavePassword(); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPw && newPw.length < 8 && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleSavePassword}
              disabled={savingPw || newPw.length < 8}
            >
              {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
