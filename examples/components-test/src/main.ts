/**
 * Components Test App
 *
 * Verifies that @cliffy-ga/components works with @cliffy-ga/core.
 */

// Default export is the WASM loader, named exports are the API
import initWasm, { init, behavior, DOMProjection } from '@cliffy-ga/core';
import { initHtml, mount } from '@cliffy-ga/core/html';
import {
  Button,
  Text,
  Input,
  Stack,
  HStack,
  VStack,
  Box,
  Center,
  Spacer,
} from '@cliffy-ga/components';

// Import theme CSS (direct path for local development)
import '../../../packages/components/dist/theme.css';

async function main() {
  // Load WASM module first
  await initWasm();

  // Then initialize Cliffy and html template system
  init();
  initHtml(DOMProjection);

  // Create reactive state
  const count = behavior(0);
  const name = behavior('');
  const countLabel = count.map((n: number) => `Count: ${n}`);
  const greeting = name.map((n: string) => n ? `Hello, ${n}!` : 'Enter your name above');

  // Build the UI
  const app = await VStack({ gap: 'lg', children: [
    // Header
    await Text({ content: 'Cliffy Components Test', size: '2xl', weight: 'bold' }),
    await Text({ content: 'Testing component integration with @cliffy-ga/core', color: 'var(--cliffy-color-muted)' }),

    // Counter section
    await Box({ padding: 'lg', className: 'section', children: [
      await VStack({ gap: 'md', children: [
        await Text({ content: 'Counter', size: 'lg', weight: 'semibold' }),
        await Text({ content: countLabel, size: 'xl' }),
        await HStack({ gap: 'sm', children: [
          await Button({
            label: '-',
            onClick: () => count.update((n: number) => n - 1),
            variant: 'secondary',
          }),
          await Button({
            label: '+',
            onClick: () => count.update((n: number) => n + 1),
            variant: 'primary',
          }),
          await Spacer(),
          await Button({
            label: 'Reset',
            onClick: () => count.set(0),
            variant: 'ghost',
          }),
        ]}),
      ]}),
    ]}),

    // Input section
    await Box({ padding: 'lg', className: 'section', children: [
      await VStack({ gap: 'md', children: [
        await Text({ content: 'Input Test', size: 'lg', weight: 'semibold' }),
        await Input({
          value: name,
          placeholder: 'Type your name...',
          fullWidth: true,
        }),
        await Text({ content: greeting }),
      ]}),
    ]}),

    // Layout section
    await Box({ padding: 'lg', className: 'section', children: [
      await VStack({ gap: 'md', children: [
        await Text({ content: 'Layout Components', size: 'lg', weight: 'semibold' }),
        await Center({ children: [
          await Box({ padding: 'md', children: [
            await Text({ content: 'Centered content' }),
          ]}),
        ]}),
        await HStack({ gap: 'sm', justify: 'between', children: [
          await Button({ label: 'Left', onClick: () => {}, variant: 'ghost' }),
          await Button({ label: 'Center', onClick: () => {}, variant: 'ghost' }),
          await Button({ label: 'Right', onClick: () => {}, variant: 'ghost' }),
        ]}),
      ]}),
    ]}),

    // Button variants section
    await Box({ padding: 'lg', className: 'section', children: [
      await VStack({ gap: 'md', children: [
        await Text({ content: 'Button Variants', size: 'lg', weight: 'semibold' }),
        await HStack({ gap: 'sm', wrap: true, children: [
          await Button({ label: 'Primary', onClick: () => {}, variant: 'primary' }),
          await Button({ label: 'Secondary', onClick: () => {}, variant: 'secondary' }),
          await Button({ label: 'Ghost', onClick: () => {}, variant: 'ghost' }),
          await Button({ label: 'Danger', onClick: () => {}, variant: 'danger' }),
        ]}),
        await HStack({ gap: 'sm', wrap: true, children: [
          await Button({ label: 'XS', onClick: () => {}, size: 'xs' }),
          await Button({ label: 'SM', onClick: () => {}, size: 'sm' }),
          await Button({ label: 'MD', onClick: () => {}, size: 'md' }),
          await Button({ label: 'LG', onClick: () => {}, size: 'lg' }),
          await Button({ label: 'XL', onClick: () => {}, size: 'xl' }),
        ]}),
      ]}),
    ]}),
  ]});

  // Mount to DOM
  mount(app, '#app');

  console.log('Components test app loaded!');
}

main().catch(console.error);
