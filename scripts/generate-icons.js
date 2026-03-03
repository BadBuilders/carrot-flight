#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Creates placeholder PWA icons in the public/icons folder
 * Install: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('sharp library not installed. Install with: npm install sharp');
  console.log('Alternatively, you can manually create PNG icons in public/icons/ folder');
  process.exit(1);
}

const iconsDir = path.join(__dirname, 'public', 'icons');

// Create directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log(`Created directory: ${iconsDir}`);
}

// Create a simple colored square as placeholder
async function createPlaceholderIcon(size, filename, isMaskable = false) {
  const color = isMaskable ? '#FF6B6B' : '#FF9500';
  
  try {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: color
      }
    })
    .png()
    .toFile(path.join(iconsDir, filename));
    
    console.log(`✓ Created ${filename} (${size}x${size})`);
  } catch (err) {
    console.error(`✗ Failed to create ${filename}:`, err.message);
  }
}

async function generateIcons() {
  console.log('Generating PWA icons...\n');
  
  await createPlaceholderIcon(192, 'icon-192x192.png', false);
  await createPlaceholderIcon(512, 'icon-512x512.png', false);
  await createPlaceholderIcon(192, 'icon-maskable-192x192.png', true);
  await createPlaceholderIcon(512, 'icon-maskable-512x512.png', true);
  await createPlaceholderIcon(192, 'play-192x192.png', false);
  
  console.log('\n✓ PWA icons generated successfully!');
  console.log(`Icons location: ${iconsDir}`);
  console.log('\nNote: These are placeholder icons. Replace them with your actual game logos.');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
