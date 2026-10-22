import sharp from 'sharp';
await sharp(new URL('./public/social-preview.svg', import.meta.url).pathname)
  .png()
  .toFile(new URL('./public/social-preview.png', import.meta.url).pathname);
console.log('Generated brand-only social preview: 1200x630.');
