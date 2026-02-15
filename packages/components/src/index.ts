/**
 * @cliffy-ga/components
 *
 * UI component library for Cliffy applications.
 * Components use async factories to handle WASM initialization.
 */

// Primitives
export {
  Box,
  type BoxProps,
  Text,
  type TextProps,
  Button,
  type ButtonProps,
  Input,
  type InputProps,
  Checkbox,
  type CheckboxProps,
} from './primitives';

// Layout
export {
  Stack,
  HStack,
  VStack,
  type StackProps,
  Grid,
  type GridProps,
  Center,
  type CenterProps,
  Spacer,
  type SpacerProps,
} from './layout';

// Forms
export {
  FormField,
  type FormFieldProps,
  TextField,
  type TextFieldProps,
  Select,
  type SelectProps,
  type SelectOption,
} from './forms';

// Feedback
export {
  Badge,
  type BadgeProps,
  type BadgeVariant,
  Spinner,
  type SpinnerProps,
  Progress,
  type ProgressProps,
  type ProgressVariant,
} from './feedback';

// Theme
export { tokens, colors, spacing, typography, radii, shadows, transitions } from './theme';

// Types
export type {
  BehaviorProp,
  Size,
  SpacingValue,
  ColorVariant,
  TextSize,
  FontWeight,
  FlexDirection,
  FlexAlign,
  FlexJustify,
  ButtonVariant,
  InputType,
  StyleProps,
} from './types';

export { isBehavior, toSpacingValue } from './types';
