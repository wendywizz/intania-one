# Modern Design System - Staff Management App 🚀

A comprehensive, energetic design system with bold colors, dark mode support, and smooth animations for your React Native/Expo staff management application.

## 🎨 Design Principles

- **Clean & Minimal**: Simple, uncluttered interfaces
- **Energetic & Bold**: Vibrant colors that motivate action
- **Dark Mode Ready**: Full dark mode support throughout
- **Smooth Interactions**: Satisfying animations and transitions
- **Accessible**: High contrast ratios and clear hierarchy

## 📦 Design System Files

### Core Files

- **`constants/designSystem.ts`** - Central design system with colors, typography, spacing, and shadows
- **`components/modern-card.tsx`** - Card components (MenuCard, ProgressCard, StatCard, ModernButton)
- **`components/modern-layout.tsx`** - Layout components (SectionHeader, WelcomeBanner, GridCard)
- **`components/modern-nav-bar.tsx`** - Navigation components (ModernNavBar, ModernTabBar)
- **`context/ThemeContext.tsx`** - Theme provider for dark mode support

## 🎨 Color Palette

### Primary Colors

- **Primary (Indigo)**: `#6366F1` (Light) / `#818CF8` (Dark)
- **Secondary (Orange)**: `#F97316` (Light) / `#FB923C` (Dark)
- **Tertiary (Emerald)**: `#10B981` (Light) / `#34D399` (Dark)

### Semantic Colors

- **Danger (Red)**: `#EF4444`
- **Warning (Amber)**: `#F59E0B`
- **Success**: Same as Tertiary
- **Background**: `#FFFFFF` (Light) / `#0F172A` (Dark)
- **Surface**: `#F8FAFC` (Light) / `#1E293B` (Dark)

### How to Use Colors

```typescript
import { useDesignSystem } from '@/constants/designSystem';

export function MyComponent() {
  const { colors } = useDesignSystem();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

## 📐 Spacing System

```typescript
import { Spacing } from '@/constants/designSystem';

// xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, xxl: 32px, xxxl: 48px
<View style={{ marginBottom: Spacing.lg }}>
```

## 🔤 Typography

All typography styles follow modern Material Design principles:

- **Display Large** - 32px, Bold (Hero titles)
- **Heading Large** - 22px, Bold (Page titles)
- **Heading Medium** - 18px, Semibold (Section titles)
- **Body Large** - 16px, Regular (Main content)
- **Body Medium** - 14px, Regular (Secondary content)
- **Label** - 12-14px, Semibold (UI labels)

```typescript
import { Typography } from '@/constants/designSystem';

<Text style={[Typography.headingMedium, { color: colors.text }]}>
  Section Title
</Text>
```

## 🎯 Component Usage

### 1. Modern Card

```typescript
import { MenuCard, ProgressCard, StatCard } from '@/components/modern-card';

// Menu Card (for actions)
<MenuCard
  title="Request Absence"
  description="Submit time off"
  accentColor={colors.primary}
  onPress={() => navigate('/absent')}
/>

// Progress Card (for tracking)
<ProgressCard
  title="Attendance Rate"
  value={92}
  max={100}
  unit="%"
  color={colors.tertiary}
/>

// Stat Card (for metrics)
<StatCard
  label="Active Tasks"
  value="8"
  color={colors.primary}
  trend="up"
  trendValue="+2"
/>
```

### 2. Layout Components

```typescript
import { SectionHeader, WelcomeBanner, ModernContainer } from '@/components/modern-layout';

<ModernContainer>
  <WelcomeBanner
    name="John Doe"
    greeting="Welcome back! 👋"
  />

  <SectionHeader
    title="Quick Actions"
    subtitle="Manage your work efficiently"
  />

  {/* Your content here */}
</ModernContainer>
```

### 3. Modern Buttons

```typescript
import { ModernButton } from '@/components/modern-card';

<ModernButton
  title="Submit"
  variant="primary" // 'primary' | 'secondary' | 'outline' | 'ghost'
  size="large"      // 'small' | 'medium' | 'large'
  onPress={() => handleSubmit()}
/>

<ModernButton
  title="Cancel"
  variant="outline"
  size="medium"
/>
```

### 4. Navigation Components

```typescript
import { ModernNavBar, ModernTabBar } from '@/components/modern-nav-bar';

<ModernNavBar
  title="Staff Management"
  subtitle="Manage your tasks"
  rightContent={<UserProfileIcon />}
/>

<ModernTabBar
  tabs={[
    { name: 'Home', icon: <HomeIcon /> },
    { name: 'Tasks', icon: <TaskIcon />, badge: 3 },
  ]}
  activeIndex={activeTab}
  onTabPress={setActiveTab}
/>
```

## 🌙 Dark Mode Implementation

Dark mode is automatically handled by the `useDesignSystem` hook and respects system preferences.

```typescript
import { useDesignSystem } from '@/constants/designSystem';

export function MyComponent() {
  const { colors, isDark } = useDesignSystem();

  return (
    <View style={{
      backgroundColor: colors.background,
      borderColor: colors.border,
    }}>
      {isDark && <View>Dark mode content</View>}
    </View>
  );
}
```

## 🎬 Animations

```typescript
import { AnimationDuration } from "@/constants/designSystem";

Animated.timing(animValue, {
  toValue: 1,
  duration: AnimationDuration.md, // 300ms
  useNativeDriver: true,
}).start();
```

## 🎨 Shadows & Elevation

```typescript
import { Shadows } from '@/constants/designSystem';

<View style={Shadows.lg}>
  {/* Content with large shadow */}
</View>

// Available: xs, sm, md, lg, xl
```

## 📱 Responsive Design

The design system uses flexible components that adapt to screen sizes:

```typescript
<View style={[
  styles.gridContainer,
  { marginBottom: spacing.xl }
]}>
  {items.map(item => (
    <MenuCard
      key={item.id}
      title={item.title}
      accentColor={item.color}
    />
  ))}
</View>
```

## 🔧 Customization

To customize the design system:

1. **Edit `constants/designSystem.ts`** for colors, spacing, or typography
2. **Create new components** in `components/` using `useDesignSystem()`
3. **Update specific screens** as needed

Example custom component:

```typescript
import { useDesignSystem } from '@/constants/designSystem';
import { ModernCard } from '@/components/modern-card';

export function CustomCard() {
  const { colors, spacing, borderRadius } = useDesignSystem();

  return (
    <ModernCard style={{
      padding: spacing.xl,
      borderRadius: borderRadius.xl,
    }}>
      {/* Content */}
    </ModernCard>
  );
}
```

## 🚀 Best Practices

1. **Always use `useDesignSystem()`** for consistency
2. **Leverage pre-built components** like `MenuCard`, `StatCard`
3. **Use semantic color names** (e.g., `colors.primary`) over hex codes
4. **Implement proper spacing** using the spacing system
5. **Test in both light and dark modes**
6. **Use shadows for elevation**, not borders alone

## 📊 Component Hierarchy

```
ModernContainer
├── WelcomeBanner
├── SectionHeader
├── MenuCard (Grid)
├── ProgressCard
├── StatCard
├── ModernButton
└── News Cards
```

## 🎨 Example: Complete Screen

```typescript
import { useDesignSystem } from '@/constants/designSystem';
import { ModernContainer, SectionHeader, WelcomeBanner } from '@/components/modern-layout';
import { MenuCard, ProgressCard, ModernButton } from '@/components/modern-card';

export default function ExampleScreen() {
  const { colors, spacing } = useDesignSystem();

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: spacing.lg }}>
      <ModernContainer>
        <WelcomeBanner name="John" />

        <SectionHeader title="Progress" subtitle="Your performance" />
        <ProgressCard title="Attendance" value={92} max={100} />

        <SectionHeader title="Actions" />
        <MenuCard title="Request Leave" onPress={() => {}} />

        <ModernButton title="Continue" variant="primary" size="large" />
      </ModernContainer>
    </ScrollView>
  );
}
```

## 📞 Support

For questions or issues with the design system, refer to:

- Design files in `constants/` folder
- Component examples in `components/` folder
- This documentation file

---

**Last Updated**: 2026-06-07
**Design System Version**: 1.0.0
**Status**: ✅ Production Ready
