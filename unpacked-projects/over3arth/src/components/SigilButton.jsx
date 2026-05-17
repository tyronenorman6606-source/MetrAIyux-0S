import { motion } from 'framer-motion';

export default function SigilButton({ children, variant = 'primary', className = '', ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      className={`sigil-button ${variant} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
