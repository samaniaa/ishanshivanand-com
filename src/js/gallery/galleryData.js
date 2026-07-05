/**
 * Showreel tile manifest. PLACEHOLDER: swap src values for real
 * photography (512px webp) as it arrives; labels describe the intended
 * vibe slot (see PLACEHOLDERS.md).
 */
export const tiles = [
  { label: 'Keynote, institutional stage' },
  { label: 'Hospital program delivery' },
  { label: 'Rural clinic, Rajasthan' },
  { label: 'University research visit' },
  { label: 'Champions program, Mauritius' },
  { label: 'Live forum, large audience' },
  { label: 'Field medical, East Africa' },
  { label: 'IIT Ropar, Centre opening' },
  { label: 'Quiet practice, teaching' },
  { label: 'Government reception' },
  { label: 'Book, reader moment' },
  { label: 'Corporate program, workshop' },
].map((t, i) => ({ ...t, src: null, href: '/media/', id: i }))
