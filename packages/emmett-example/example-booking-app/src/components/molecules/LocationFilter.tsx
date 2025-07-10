import { Input } from '../atoms/input';
import { Search } from 'lucide-react';

export interface LocationFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const LocationFilter = ({ value, onChange, placeholder = "Where are you going?" }: LocationFilterProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-12 text-base"
      />
    </div>
  );
};