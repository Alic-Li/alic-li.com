// Fixed routing: browser input never becomes an upstream URL.
export const rwkvModels = [
  { id: 'rwkv-1.5b', label: 'RWKV 1.5B', origin: 'https://api-1b5.rwkvos.com' },
  { id: 'rwkv-3b', label: 'RWKV 3B', origin: 'https://api-3b.rwkvos.com' },
  { id: 'rwkv-7b', label: 'RWKV 7B', origin: 'https://api-7b.rwkvos.com' },
  { id: 'rwkv-13b', label: 'RWKV 13B', origin: 'https://api-13b.rwkvos.com' },
] as const;
