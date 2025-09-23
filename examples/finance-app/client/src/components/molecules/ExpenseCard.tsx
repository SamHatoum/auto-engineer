import React from 'react';
import { Card, CardContent } from '../atoms/card';
import { Button } from '../atoms/button';
import { Badge } from '../atoms/badge';
import { Trash2, Edit3 } from 'lucide-react';

export interface ExpenseCardProps {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ExpenseCard({ id, amount, category, note, date, onEdit, onDelete }: ExpenseCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-lg text-foreground">{formatAmount(amount)}</span>
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            </div>
            {note && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{note}</p>}
            <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(id)} className="h-8 w-8 p-0">
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
