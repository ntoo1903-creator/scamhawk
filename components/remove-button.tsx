'use client';

import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';

export default function RemoveButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    try {
      await fetch('/api/watch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
    } finally {
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={removing}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
    >
      <Trash2Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
