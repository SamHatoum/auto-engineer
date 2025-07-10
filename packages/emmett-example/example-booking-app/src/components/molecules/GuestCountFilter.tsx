import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../atoms/select';

export interface GuestCountFilterProps {
  value?: number;
  onChange: (value: number) => void;
  maxGuests?: number;
}

export const GuestCountFilter = ({ value, onChange, maxGuests = 12 }: GuestCountFilterProps) => {
  const handleValueChange = (stringValue: string) => {
    const numValue = parseInt(stringValue, 10);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const guestOptions = Array.from({ length: maxGuests }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Guests
      </label>
      <Select value={value?.toString()} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select guests" />
        </SelectTrigger>
        <SelectContent>
          {guestOptions.map((count) => (
            <SelectItem key={count} value={count.toString()}>
              {count} {count === 1 ? 'guest' : 'guests'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};