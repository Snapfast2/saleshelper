'use client';

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, filter: "blur(10px)", y: 10 }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 24, 
        mass: 0.8 
      }}
      style={{ transformOrigin: "top center" }}
    >
      {children}
    </motion.div>
  );
}
