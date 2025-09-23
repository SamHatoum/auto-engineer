import React from 'react';
import { TestimonialCard } from '../molecules/TestimonialCard';

export interface TestimonialsSectionProps {
  className?: string;
}

const testimonials = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Marketing Manager',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face',
    quote:
      'This app completely changed how I manage my finances. The round-up savings feature helped me save $500 without even thinking about it.',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'Software Developer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
    quote:
      'The subscription tracking is a game-changer. I discovered I was paying for services I forgot about and saved $80 per month.',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Teacher',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face',
    quote:
      'Simple, clean, and effective. The budget tracking keeps me on track without being overwhelming. Perfect for busy professionals.',
  },
];

export function TestimonialsSection({ className = '' }: TestimonialsSectionProps) {
  console.log('TestimonialsSection: Rendering testimonials section');

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-3xl font-bold text-foreground mb-4">Trusted by thousands of users</div>
          <div className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our app is helping people take control of their finances
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              name={testimonial.name}
              role={testimonial.role}
              avatar={testimonial.avatar}
              quote={testimonial.quote}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
