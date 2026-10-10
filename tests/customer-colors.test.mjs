import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import config from '../tailwind.config.ts';

const brand = config.theme.extend.colors.brand;
const css = await readFile(new URL('../src/customer.css', import.meta.url), 'utf8');
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const luminance = color => color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (first, second) => (Math.max(luminance(first), luminance(second)) + 0.05) / (Math.min(luminance(first), luminance(second)) + 0.05);
const overWhite = (color, opacity) => color.map(value => value * opacity + 255 * (1 - opacity));
const check = (first, second, threshold, name) => assert.ok(contrast(first, second) >= threshold, `${name}: ${contrast(first, second).toFixed(3)} < ${threshold}`);

test('customer palette: text, action hover, vivid accents and field/focus boundaries meet WCAG AA', () => {
  for (const background of ['#ffffff', brand.cream, brand.blush, brand.petal]) {
    for (const foreground of [brand.ink, brand.muted, brand.primary, brand.hover]) check(rgb(foreground), rgb(background), 4.5, `${foreground} on ${background}`);
    check(rgb(brand.field), rgb(background), 3, `field border on ${background}`);
    check(rgb(brand.primary), rgb(background), 3, `focus ring on ${background}`);
  }
  for (const background of [brand.primary, brand.hover]) {
    check(rgb('#ffffff'), rgb(background), 4.5, `white action text on ${background}`);
    check(rgb(brand.petal), rgb(background), 4.5, `secondary text on ${background}`);
    check(rgb('#ffffff'), rgb(background), 3, `light focus ring on ${background}`);
  }
  for (const background of [brand.pop, brand.sun]) check(rgb(brand.ink), rgb(background), 4.5, `dark text on vivid accent ${background}`);
});

test('hero and photo labels: bounded overlays keep text readable even over a pure white photo', () => {
  // The browser tests also verify that the text boxes stay inside these stops.
  const overlays = [...css.matchAll(/brand-(?:hero-overlay|category-shade|article-shade)\s*\{([^}]+)\}/g)];
  assert.equal(overlays.length, 4);
  for (const [name, declaration] of overlays) {
    const [red, green, blue, opacity] = declaration.match(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/).slice(1).map(Number);
    const background = overWhite([red, green, blue], opacity);
    check(rgb('#ffffff'), background, 4.5, `${name}: body text on brightest possible photo`);
    if (name.includes('hero-overlay')) check(rgb(brand.sun), background, 3, `${name}: large highlighted heading`);
    if (!name.includes('hero-overlay')) {
      const stops = [...declaration.matchAll(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/g)];
      const [r, g, b, alpha] = stops[1].slice(1).map(Number);
      check(rgb('#ffffff'), overWhite([r, g, b], alpha), 4.5, `${name}: top of label area`);
    }
  }
});
