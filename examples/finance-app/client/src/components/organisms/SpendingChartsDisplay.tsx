import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../atoms/Select';
import { Button } from '../atoms/Button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../atoms/Chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FilterControls } from '../molecules/FilterControls';

interface SpendingChartsDisplayProps {
  className?: string;
}

// Mock data - in real app this would come from GraphQL
const mockDailyData = [
  { day: 'Mon', amount: 45.5, category: 'Food' },
  { day: 'Tue', amount: 23.75, category: 'Transport' },
  { day: 'Wed', amount: 67.2, category: 'Food' },
  { day: 'Thu', amount: 12.3, category: 'Entertainment' },
  { day: 'Fri', amount: 89.4, category: 'Shopping' },
  { day: 'Sat', amount: 156.8, category: 'Food' },
  { day: 'Sun', amount: 34.2, category: 'Entertainment' },
];

const mockCategoryData = [
  { category: 'Food', amount: 269.5, color: 'hsl(var(--chart-1))' },
  { category: 'Shopping', amount: 89.4, color: 'hsl(var(--chart-2))' },
  { category: 'Entertainment', amount: 46.5, color: 'hsl(var(--chart-3))' },
  { category: 'Transport', amount: 23.75, color: 'hsl(var(--chart-4))' },
];

const mockWeeklyData = [
  { week: 'Week 1', amount: 234.5 },
  { week: 'Week 2', amount: 189.3 },
  { week: 'Week 3', amount: 298.75 },
  { week: 'Week 4', amount: 156.2 },
];

export function SpendingChartsDisplay({ className }: SpendingChartsDisplayProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedCategory, setSelectedCategory] = useState('all');

  console.log('SpendingChartsDisplay rendered with period:', selectedPeriod);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    console.log('Period changed to:', period);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    console.log('Category filter changed to:', category);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <FilterControls onPeriodChange={handlePeriodChange} onCategoryChange={handleCategoryFilter} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Daily Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: 'Amount',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDailyData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: 'Amount',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockCategoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    label={({ category, amount }) => `${category}: $${amount}`}
                  >
                    {mockCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Weekly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: 'Amount',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockWeeklyData}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCategoryData.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="font-medium">{category.category}</span>
                </div>
                <span className="text-lg font-semibold">${category.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
