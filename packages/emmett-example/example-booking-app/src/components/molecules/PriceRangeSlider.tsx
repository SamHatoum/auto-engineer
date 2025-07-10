import { useState } from 'react';
import { Slider } from '@/components/atoms/slider';

export interface PriceRangeSliderProps {
  min?: number;
  max?: number;
  value?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  className?: string;
}

export const PriceRangeSlider = ({
  min = 0,
  max = 1000,
  value = [min, max],
  onValueChange,
  className = ''
}: PriceRangeSliderProps) => {
  const [localValue, setLocalValue] = useState<[number, number]>(value);

  const handleValueChange = (newValue: number[]) => {
    const rangeValue = [newValue[0], newValue[1]] as [number, number];
    setLocalValue(rangeValue);
    onValueChange?.(rangeValue);
    console.log('Price range changed:', rangeValue);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Price Range</span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(localValue[0])} - {formatPrice(localValue[1])}
        </span>
      </div>
      
      <div className="px-2">
        <Slider
          min={min}
          max={max}
          step={10}
          value={localValue}
          onValueChange={handleValueChange}
          className="w-full"
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatPrice(min)}</span>
        <span>{formatPrice(max)}</span>
      </div>
    </div>
  );
};