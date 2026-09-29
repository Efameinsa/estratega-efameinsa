"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import superjson from "superjson";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Los datos del plan cambian poco: evita recargar al volver a una página.
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // Streaming: cada procedimiento del lote responde apenas termina,
        // sin esperar al más lento.
        httpBatchStreamLink({
          url: "/api/trpc",
          transformer: superjson,
          maxURLLength: 2083,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
