import React from 'react'
import './Button.css'

type Variant = 'ghost' | 'primary' | 'default'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  className?: string
}

const variantMap: Record<Variant, string> = {
  ghost: 'btn--ghost',
  default: 'btn--default',
  primary: 'btn--primary',
}

const sizeMap: Record<Size, string> = {
  sm: 'btn--sm',
  md: 'btn--md',
  lg: 'btn--lg',
}

export default function Button({ variant = 'ghost', size = 'md', className = '', children, ...rest }: ButtonProps) {
  const base = 'btn'
  const classes = `${base} ${variantMap[variant] ?? ''} ${sizeMap[size] ?? ''} ${className}`.trim()

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
