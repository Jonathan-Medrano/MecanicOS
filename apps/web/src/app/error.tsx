"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
