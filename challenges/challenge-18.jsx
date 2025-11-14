// En este desafío, nuestro objetivo es refactorizar nuestra aplicación para usar un enfoque más estructurado para definir nuestras QueryKeys. Crearemos dos fábricas, bookQueries y reviewQueries, que nos ayudarán a definir nuestras QueryKeys de una manera más consistente. Para lograr esto, editarás tanto queries.js como mutations.js.

// 🎯 Tareas a Realizar

// Crear una fábrica de queries para bookQueries con keys para all, detail, featured, myBooks y search.

// Crear y exportar una fábrica de queries para reviewQueries con keys para all, detail y latest.

// Refactorizar todas las queries para usar las nuevas fábricas de queries.

// Refactorizar todas las mutaciones para usar las nuevas fábricas de queries.

// queries.js

import { useQueryClient, useQuery, QueryClient } from "@tanstack/react-query";

import {
  getMyBooks,
  getBook,
  getReviewsForBook,
  getFeaturedBooks,
  getLatestReview,
  getBookSearchResult
} from "./utils";

export const client = new QueryClient();

export const bookQueries = {
  all: () => ({
    queryKey: ["books"]
  }),
  detail: (bookId) => ({
    queryKey: ["books", bookId],
    queryFn: () => getBook(bookId),
    staleTime: Infinity
  }),
  featured: () => ({
    queryKey: ["books", "featured"],
    queryFn: getFeaturedBooks,
    staleTime: Infinity
  }),
  myBooks: () => ({
    queryKey: ["books", "my-books"],
    queryFn: getMyBooks
  }),
  search: (query, page) => ({
    queryKey: ["books", "search", query, page],
    queryFn: () => getBookSearchResult(query, page),
    enabled: Boolean(query),
    placeholderData: (previousData) => previousData
  })
};

export const reviewQueries = {
  all: () => ({
    queryKey: ["reviews"]
  }),
  detail: (bookId) => ({
    queryKey: ["reviews", bookId],
    queryFn: () => getReviewsForBook(bookId)
  }),
  latest: () => ({
    queryKey: ["reviews", "latest"],
    queryFn: getLatestReview
  })
};

export function useBookReviews(bookId) {
  return useQuery(reviewQueries.detail(bookId));
}

export function useBookQuery(bookId) {
  const queryClient = useQueryClient();
  return useQuery({
    ...bookQueries.detail(bookId),
    initialData: () => {
      return queryClient
        .getQueryData(bookQueries.featured().queryKey)
        ?.find((book) => book.id === bookId);
    }
  });
}

export function usePrefetchBookById(bookId) {
  const queryClient = useQueryClient();
  const prefetch = () => {
    queryClient.prefetchQuery(bookQueries.detail(bookId));
  };

  return { prefetch };
}

export function useFeaturedBooks() {
  return useQuery(bookQueries.featured());
}

export function useLatestReview() {
  return useQuery(reviewQueries.latest());
}

export function useMyBooks() {
  return useQuery(bookQueries.myBooks());
}

export function useSearchQuery(query, page) {
  return useQuery(bookQueries.search(query, page));
}

// mutations.js

import { useQueryClient, useMutation } from "@tanstack/react-query";

import {
  checkoutBook,
  returnBook,
  postReviewData,
  updateReview
} from "./utils";
import { reviewQueries, bookQueries } from "./queries";

export function usePostReview(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, rating, text }) =>
      postReviewData({ bookId, title, rating, text }),
    onSuccess: () => {
      return queryClient.invalidateQueries(reviewQueries.all());
    }
  });
}

export function useCheckoutBook(book) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkoutBook(book.id),
    onMutate: async () => {
      await queryClient.cancelQueries(bookQueries.all());

      const snapshot = {
        myBooks: queryClient.getQueryData(bookQueries.myBooks().queryKey),
        bookDetail: queryClient.getQueryData(
          bookQueries.detail(book.id).queryKey
        )
      };

      queryClient.setQueryData(
        bookQueries.myBooks().queryKey,
        (previousBooks) =>
          previousBooks ? [...previousBooks, book] : undefined
      );

      queryClient.setQueryData(
        bookQueries.detail(book.id).queryKey,
        (previousBook) =>
          previousBook
            ? {
                ...previousBook,
                isCheckedOutByUser: true,
                availableCopies: previousBook.availableCopies - 1
              }
            : undefined
      );

      return () => {
        queryClient.setQueryData(
          bookQueries.myBooks().queryKey,
          snapshot.myBooks
        );
        queryClient.setQueryData(
          bookQueries.detail(book.id).queryKey,
          snapshot.bookDetail
        );
      };
    },
    onError: (err, _variables, rollback) => {
      console.log(err);
      rollback?.();
    },
    onSettled: () => {
      return queryClient.invalidateQueries(bookQueries.all());
    }
  });
}

export function useReturnBook(book) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => returnBook(book.id),
    onMutate: async () => {
      await queryClient.cancelQueries(bookQueries.all());

      const snapshot = {
        myBooks: queryClient.getQueryData(bookQueries.myBooks().queryKey),
        bookDetail: queryClient.getQueryData(
          bookQueries.detail(book.id).queryKey
        )
      };

      queryClient.setQueryData(
        bookQueries.myBooks().queryKey,
        (previousBooks) =>
          previousBooks
            ? previousBooks.filter((b) => b.id !== book.id)
            : undefined
      );

      queryClient.setQueryData(
        bookQueries.detail(book.id).queryKey,
        (previousBook) =>
          previousBook
            ? {
                ...previousBook,
                isCheckedOutByUser: false,
                availableCopies: previousBook.availableCopies + 1
              }
            : undefined
      );

      return () => {
        queryClient.setQueryData(
          bookQueries.myBooks().queryKey,
          snapshot.myBooks
        );
        queryClient.setQueryData(
          bookQueries.detail(book.id).queryKey,
          snapshot.bookDetail
        );
      };
    },
    onError: (err, _variables, rollback) => {
      console.log(err);
      rollback?.();
    },
    onSettled: () => {
      return queryClient.invalidateQueries(bookQueries.all());
    }
  });
}

export function useEditReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, text, rating, reviewId }) =>
      updateReview({ reviewId, title, text, rating }),
    onSuccess: () => {
      return queryClient.invalidateQueries(reviewQueries.all());
    }
  });
}