import { Card, CardContent } from '../atoms/Card';
import { Avatar, AvatarFallback, AvatarImage } from '../atoms/Avatar';

export interface TestimonialCardProps {
  name: string;
  photo?: string;
  quote: string;
  role?: string;
}

export function TestimonialCard({ name, photo, quote, role }: TestimonialCardProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card className="p-6 h-full">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={photo} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-foreground">{name}</div>
            {role && <div className="text-sm text-muted-foreground">{role}</div>}
          </div>
        </div>
        <blockquote className="text-muted-foreground leading-relaxed">"{quote}"</blockquote>
      </CardContent>
    </Card>
  );
}
