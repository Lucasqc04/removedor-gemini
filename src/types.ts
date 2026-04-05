export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RelativeSize {
  widthPercent: number
  heightPercent: number
}
