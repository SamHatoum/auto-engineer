import React from 'react';
import { Card, CardContent, CardHeader } from '../atoms/card';
import { Badge } from '../atoms/badge';
import { Button } from '../atoms/button';

export interface SubscriptionCardProps {
  name: string;
  amount: number;
  renewalDate: string;
  category?: string;
  isActive?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  name,
  amount,
  renewalDate,
  category = 'General',
  isActive = true,
  onEdit,
  onCancel,
}) => {
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
      year: 'numeric',
    });
  };

  const getDaysUntilRenewal = (dateString: string) => {
    const renewalDate = new Date(dateString);
    const today = new Date();
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilRenewal = getDaysUntilRenewal(renewalDate);
  const isUpcoming = daysUntilRenewal <= 7 && daysUntilRenewal >= 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="font-medium text-sm">{name}</div>
            <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
              {category}
            </Badge>
          </div>
          <div className="text-right">
            <div className="font-semibold text-lg">{formatAmount(amount)}</div>
            <div className="text-xs text-muted-foreground">monthly</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Next renewal</div>
            <div className={`text-sm font-medium ${isUpcoming ? 'text-primary' : ''}`}>{formatDate(renewalDate)}</div>
            {isUpcoming && (
              <Badge variant="outline" className="text-xs">
                {daysUntilRenewal === 0 ? 'Today' : `${daysUntilRenewal} days`}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onCancel && (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
