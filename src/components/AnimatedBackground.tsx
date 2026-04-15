import { useTheme } from '../ThemeContext';

export default function AnimatedBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundColor: isDark ? '#000000' : '#f8fafc',
        backgroundImage: isDark
          ? `
            radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
            radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
          `
          : `
            radial-gradient(circle at 50% 100%, rgba(191, 202, 232, 0.7) 0%, transparent 60%),
            radial-gradient(circle at 50% 100%, rgba(129, 140, 248, 0.35) 0%, transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(224, 231, 255, 0.6) 0%, transparent 80%)
          `,
      }}
    />
  );
}
