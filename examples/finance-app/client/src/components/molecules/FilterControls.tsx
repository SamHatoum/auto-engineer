import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../atoms/Select';
import { Button } from '../atoms/Button';
import { Calendar } from '../atoms/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../atoms/Popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface FilterControlsProps {
  selectedCategory?: string;
  onCategoryChange: (category: string) => void;
  selectedDateRange?: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  onClearFilters: () => void;
}

export function FilterControls({
  selectedCategory,
  onCategoryChange,
  selectedDateRange,
  onDateRangeChange,
  onClearFilters,
}: FilterControlsProps) {
  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Travel',
    'Other',
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
      <div className="flex-1 min-w-48">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
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

      <div className="flex-1 min-w-48">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDateRange?.from ? (
                selectedDateRange.to ? (
                  <>
                    {format(selectedDateRange.from, 'LLL dd, y')} - {format(selectedDateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(selectedDateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedDateRange?.from}
              selected={selectedDateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button variant="outline" onClick={onClearFilters} className="px-6">
        Clear Filters
      </Button>
    </div>
  );
}
