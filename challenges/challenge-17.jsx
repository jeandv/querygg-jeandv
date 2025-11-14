// Para este desafío, necesitarás actualizar los siguientes hooks: useBookReviews, useBookQuery, usePrefetchBookById, useFeaturedBooks, useLatestReview, useMyBooks y useSearchQuery para que utilicen una queryFn por defecto. También necesitarás dar a todas las queries de reseñas (reviews) un staleTime de 30 segundos, y el resto de las queries deben usar el staleTime por defecto.

// 🎯 Tareas a Realizar

// Crear una queryFn por defecto para el QueryClient que funcione para todas las queries de tu aplicación.

// Construir una URL para cada llamada a la API usando la queryKey.

// Eliminar la queryFn de todas las llamadas a useQuery en tu aplicación.

// Dar a todas las queries para reseñas (reviews) un staleTime de 30 segundos.

import {
  useQueryClient,
  useQuery,
  useInfiniteQuery,
  QueryClient
} from "@tanstack/react-query";

import { BASE_URL, getActivity } from "./utils";

export const client = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const slug = queryKey.join("/");
        const url = `${BASE_URL}/${slug}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Unable to fetch data");
        }

        const data = await response.json();
        return data;
      }
    }
  }
});

client.setQueryDefaults(["reviews"], {
  staleTime: 30 * 1000
});

export function useBookReviews(bookId) {
  return useQuery({
    queryKey: ["reviews", bookId]
  });
}

export function useBookQuery(bookId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["books", bookId],
    staleTime: Infinity,
    initialData: () => {
      return queryClient
        .getQueryData(["books", "featured"])
        ?.find((book) => book.id === bookId);
    }
  });
}

export function usePrefetchBookById(bookId) {
  const queryClient = useQueryClient();
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ["books", bookId]
    });
  };

  return { prefetch };
}

export function useFeaturedBooks() {
  return useQuery({
    queryKey: ["books", "featured"],
    staleTime: Infinity
  });
}

export function useLatestReview() {
  return useQuery({
    queryKey: ["reviews", "latest"]
  });
}

export function useMyBooks() {
  return useQuery({
    queryKey: ["books", "my-books"]
  });
}

export function useSearchQuery(query, page) {
  return useQuery({
    queryKey: ["books", "search", `?q=${query}&page=${page}`],
    enabled: Boolean(query),
    placeholderData: (previousData) => previousData
  });
}

export function useActivityFeed() {
  return useInfiniteQuery({
    queryKey: ["activity"],
    queryFn: ({ pageParam }) => getActivity(pageParam),
    staleTime: 5 * 1000,
    initialPageParam: 1,
    getNextPageParam: ({ currentPage, totalPages }) => {
      const nextPage = currentPage + 1;
      if (nextPage >= totalPages) {
        return undefined;
      }
      return nextPage;
    }
  });
}