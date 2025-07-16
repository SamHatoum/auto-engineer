import React from 'react'
import { cn } from '../../lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512.016 512.016" 
      className={cn(sizeClasses[size], className)}
      id="ShoppingCart"
    >
      <polygon points="145.544,151.36 105.184,31.92 0.68,31.92 0.68,0 128.096,0 175.784,141.136" fill="currentColor" />
      <polygon points="68.128,124.56 511.336,124.56 426.856,361.584 141.936,361.584" fill="#FFD67F" />
      <circle cx="377.128" cy="450.56" r="61.456" fill="currentColor" />
      <circle cx="191.752" cy="450.56" r="61.456" fill="currentColor" />
      <polygon points="325.28,52.496 451.744,180.664 325.28,308.816 203.936,308.816 330.608,180.664 203.936,52.496" fill="#FF583E" />
    </svg>
  )
}