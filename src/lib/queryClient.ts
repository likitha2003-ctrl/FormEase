import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface ApiRequestOptions {
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
}

export async function apiRequest<T = any>({
  url,
  method,
  data,
  headers = {},
}: ApiRequestOptions): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const res = await fetch(url, {
    method,
    headers: defaultHeaders,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // For DELETE requests or other methods that might not return content
  if (res.status === 204 || method.toUpperCase() === 'DELETE') {
    return {} as T;
  }
  
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
