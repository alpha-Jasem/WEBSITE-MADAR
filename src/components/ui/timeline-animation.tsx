import { motion, useInView } from "framer-motion"
import { useRef, type ElementType, type RefObject } from "react"

type ValidTag = 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'section' | 'ul' | 'li'

interface TimelineContentProps {
  as?: ValidTag
  animationNum?: number
  timelineRef?: RefObject<HTMLElement | null>
  customVariants?: {
    visible: (i: number) => object
    hidden: object
  }
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}

const MotionComponents = {
  div: motion.div,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  p: motion.p,
  section: motion.section,
  ul: motion.ul,
  li: motion.li,
} as const

const defaultVariants = (animationNum: number) => ({
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: animationNum * 0.1, duration: 0.5 },
  },
})

export function TimelineContent({
  as = 'div',
  animationNum = 0,
  timelineRef,
  customVariants,
  className,
  children,
  style,
}: TimelineContentProps) {
  const localRef = useRef<HTMLElement>(null)
  const isInView = useInView(
    (timelineRef ?? localRef) as RefObject<Element>,
    { once: true, margin: '-60px' }
  )

  const MotionTag = MotionComponents[as] as ElementType

  const variants = customVariants ?? {
    hidden: defaultVariants(animationNum).hidden,
    visible: defaultVariants(animationNum).visible,
  }

  return (
    <MotionTag
      ref={localRef}
      className={className}
      style={style}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      custom={animationNum}
    >
      {children}
    </MotionTag>
  )
}
