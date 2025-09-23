import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../atoms/Dialog';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../atoms/Select';
import { Separator } from '../atoms/Separator';
import { toast } from '../../hooks/use-toast';
import { Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewalDate: string;
  category: string;
  status: 'active' | 'cancelled';
}

export interface SubscriptionManagerProps {}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: 'Netflix',
      amount: 15.99,
      renewalDate: '2024-02-15',
      category: 'Entertainment',
      status: 'active',
    },
    {
      id: '2',
      name: 'Spotify',
      amount: 9.99,
      renewalDate: '2024-02-20',
      category: 'Entertainment',
      status: 'active',
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    renewalDate: '',
    category: '',
  });

  const totalMonthlySpend = subscriptions
    .filter((sub) => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.amount, 0);

  const upcomingRenewals = subscriptions.filter((sub) => {
    const renewalDate = new Date(sub.renewalDate);
    const today = new Date();
    const daysDiff = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 7 && daysDiff >= 0 && sub.status === 'active';
  });

  const handleAddSubscription = () => {
    if (!formData.name || !formData.amount || !formData.renewalDate || !formData.category) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const newSubscription: Subscription = {
      id: Date.now().toString(),
      name: formData.name,
      amount: parseFloat(formData.amount),
      renewalDate: formData.renewalDate,
      category: formData.category,
      status: 'active',
    };

    setSubscriptions((prev) => [...prev, newSubscription]);
    setFormData({ name: '', amount: '', renewalDate: '', category: '' });
    setIsAddDialogOpen(false);
    toast({ title: 'Subscription added successfully' });
    console.log('Added subscription:', newSubscription);
  };

  const handleEditSubscription = () => {
    if (!editingSubscription || !formData.name || !formData.amount || !formData.renewalDate || !formData.category) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const updatedSubscription: Subscription = {
      ...editingSubscription,
      name: formData.name,
      amount: parseFloat(formData.amount),
      renewalDate: formData.renewalDate,
      category: formData.category,
    };

    setSubscriptions((prev) => prev.map((sub) => (sub.id === editingSubscription.id ? updatedSubscription : sub)));
    setEditingSubscription(null);
    setFormData({ name: '', amount: '', renewalDate: '', category: '' });
    toast({ title: 'Subscription updated successfully' });
    console.log('Updated subscription:', updatedSubscription);
  };

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
    toast({ title: 'Subscription deleted successfully' });
    console.log('Deleted subscription:', id);
  };

  const openEditDialog = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      name: subscription.name,
      amount: subscription.amount.toString(),
      renewalDate: subscription.renewalDate,
      category: subscription.category,
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-foreground">Subscriptions</div>
          <div className="text-sm text-muted-foreground mt-1">Manage your recurring subscriptions</div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Netflix, Spotify, etc."
                />
              </div>
              <div>
                <Label htmlFor="amount">Monthly Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="15.99"
                />
              </div>
              <div>
                <Label htmlFor="renewalDate">Next Renewal Date</Label>
                <Input
                  id="renewalDate"
                  type="date"
                  value={formData.renewalDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, renewalDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Productivity">Productivity</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddSubscription} className="w-full">
                Add Subscription
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Monthly Total</div>
                <div className="text-xl font-semibold">${totalMonthlySpend.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Upcoming Renewals</div>
                <div className="text-xl font-semibold">{upcomingRenewals.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Subscriptions</div>
                <div className="text-xl font-semibold">
                  {subscriptions.filter((sub) => sub.status === 'active').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {upcomingRenewals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Renewals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingRenewals.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">{subscription.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Renews on {new Date(subscription.renewalDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${subscription.amount}</div>
                  <Badge variant="outline" className="text-xs">
                    {subscription.category}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptions.map((subscription, index) => (
              <div key={subscription.id}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{subscription.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Next renewal: {new Date(subscription.renewalDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                      <Badge variant="outline">{subscription.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">${subscription.amount}</div>
                      <div className="text-xs text-muted-foreground">per month</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(subscription)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteSubscription(subscription.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {index < subscriptions.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingSubscription} onOpenChange={() => setEditingSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Service Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-amount">Monthly Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-renewalDate">Next Renewal Date</Label>
              <Input
                id="edit-renewalDate"
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, renewalDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Productivity">Productivity</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditSubscription} className="w-full">
              Update Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
