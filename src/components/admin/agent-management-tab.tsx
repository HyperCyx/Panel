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
import { createAgent, getAllAgents, deleteAgent, updateAgentCommissionRate } from '@/app/actions';
import { Loader2, Plus, Trash2, UserCheck, RefreshCcw, Pencil } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

const agentFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  commissionRate: z.coerce.number().min(0).max(100, { message: 'Must be 0-100%.' }),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

export function AgentManagementTab() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: { name: '', email: '', password: '', commissionRate: 10 },
  });

  const fetchAgents = async () => {
    setLoading(true);
    const result = await getAllAgents();
    if (result.agents) setAgents(result.agents);
    else if (result.error) toast({ variant: 'destructive', title: 'Error', description: result.error });
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

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

  async function handleDelete(agentId: string) {
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

  async function handleSaveRate(agentId: string) {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ variant: 'destructive', title: 'Invalid rate', description: 'Must be 0-100.' });
      return;
    }
    const result = await updateAgentCommissionRate(agentId, rate);
    if (result.success) {
      toast({ title: 'Commission Rate Updated' });
      setEditingId(null);
      fetchAgents();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      <Input type="password" placeholder="••••••••" {...field} />
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
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Agent
                </Button>
              </div>
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
                    <TableHead>Email</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>
                        {editingId === agent.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className="w-20 h-8 text-xs"
                            />
                            <span className="text-xs">%</span>
                            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => handleSaveRate(agent.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{agent.commissionRate ?? 0}%</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => { setEditingId(agent.id); setEditRate(String(agent.commissionRate ?? 0)); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
