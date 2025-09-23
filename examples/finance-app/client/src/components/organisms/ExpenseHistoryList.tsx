import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../atoms/card';
import { Button } from '../atoms/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../atoms/select';
import { Input } from '../atoms/input';
import { Badge } from '../atoms/badge';
import { Separator } from '../atoms/separator';
import { Calendar } from '../atoms/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../atoms/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../atoms/dialog';
import { Label } from '../atoms/label';
import { Textarea } from '../atoms/textarea';
import { Trash2, Edit, Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: Date;
}

interface ExpenseHistoryListProps {
  className?: string;
}

export function ExpenseHistoryList({ className }: ExpenseHistoryListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      amount: 45.5,
      category: 'Food',
      note: 'Lunch at downtown cafe',
      date: new Date('2024-01-15'),
    },
    {
      id: '2',
      amount: 120.0,
      category: 'Transportation',
      note: 'Monthly metro pass',
      date: new Date('2024-01-14'),
    },
    {
      id: '3',
      amount: 25.99,
      category: 'Entertainment',
      note: 'Movie tickets',
      date: new Date('2024-01-13'),
    },
    {
      id: '4',
      amount: 89.99,
      category: 'Shopping',
      note: 'New running shoes',
      date: new Date('2024-01-12'),
    },
  ]);

  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>(expenses);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    category: '',
    note: '',
  });

  const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare'];

  const handleFilter = () => {
    let filtered = [...expenses];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((expense) => expense.category === categoryFilter);
    }

    if (amountFilter) {
      const amount = parseFloat(amountFilter);
      filtered = filtered.filter((expense) => expense.amount >= amount);
    }

    if (dateFilter) {
      filtered = filtered.filter((expense) => format(expense.date, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd'));
    }

    setFilteredExpenses(filtered);
    console.log('Filtered expenses:', filtered.length, 'items');
  };

  const handleClearFilters = () => {
    setCategoryFilter('all');
    setAmountFilter('');
    setDateFilter(undefined);
    setFilteredExpenses(expenses);
    console.log('Filters cleared, showing all expenses');
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter((expense) => expense.id !== id);
    setExpenses(updatedExpenses);
    setFilteredExpenses(
      updatedExpenses.filter((expense) => {
        if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
        if (amountFilter && expense.amount < parseFloat(amountFilter)) return false;
        if (dateFilter && format(expense.date, 'yyyy-MM-dd') !== format(dateFilter, 'yyyy-MM-dd')) return false;
        return true;
      }),
    );
    console.log('Expense deleted:', id);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditForm({
      amount: expense.amount.toString(),
      category: expense.category,
      note: expense.note,
    });
  };

  const handleSaveEdit = () => {
    if (!editingExpense) return;

    const updatedExpenses = expenses.map((expense) =>
      expense.id === editingExpense.id
        ? {
            ...expense,
            amount: parseFloat(editForm.amount),
            category: editForm.category,
            note: editForm.note,
          }
        : expense,
    );

    setExpenses(updatedExpenses);
    setFilteredExpenses(
      updatedExpenses.filter((expense) => {
        if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
        if (amountFilter && expense.amount < parseFloat(amountFilter)) return false;
        if (dateFilter && format(expense.date, 'yyyy-MM-dd') !== format(dateFilter, 'yyyy-MM-dd')) return false;
        return true;
      }),
    );

    setEditingExpense(null);
    console.log('Expense updated:', editingExpense.id);
  };

  const getTotalAmount = () => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  React.useEffect(() => {
    handleFilter();
  }, [categoryFilter, amountFilter, dateFilter]);

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter Expenses</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-filter">Minimum Amount</Label>
              <Input
                id="amount-filter"
                type="number"
                placeholder="0.00"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dateFilter && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
            </span>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-lg font-semibold text-primary">${getTotalAmount().toFixed(2)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No expenses found matching your filters</div>
          ) : (
            filteredExpenses.map((expense, index) => (
              <div key={expense.id}>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {expense.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{format(expense.date, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{expense.note}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-lg">${expense.amount.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Expense</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-amount">Amount</Label>
                              <Input
                                id="edit-amount"
                                type="number"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-category">Category</Label>
                              <Select
                                value={editForm.category}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, category: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-note">Note</Label>
                              <Textarea
                                id="edit-note"
                                value={editForm.note}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setEditingExpense(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveEdit}>Save Changes</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {index < filteredExpenses.length - 1 && <Separator className="my-2" />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
