'use client';
import { motion, Transition } from 'motion/react';

export type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 5,
    ease: 'linear',
  };

  return (
    <div
      className='pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent'
      style={{
        WebkitMaskClip: 'padding-box, border-box',
        WebkitMaskComposite: 'xor',
        maskClip: 'padding-box, border-box',
        maskComposite: 'exclude',
        WebkitMaskImage: 'linear-gradient(transparent,transparent), linear-gradient(#000,#000)',
        maskImage: 'linear-gradient(transparent,transparent), linear-gradient(#000,#000)',
      }}
    >
      <motion.div
        className={`absolute aspect-square bg-zinc-500 ${className || ''}`}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
