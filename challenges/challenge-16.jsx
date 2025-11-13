// En este desafío, vamos a revisitar la experiencia de prestar un libro. Queremos que este proceso se sienta instantáneo al actualizar la interfaz de usuario tan pronto como el usuario haga clic en el botón "Prestar" (Check Out).

// Tu trabajo es refactorizar el código para implementar actualizaciones optimistas (optimistic updates). Para lograr esto, necesitarás conocer la estructura de los datos que nuestra UI de libros está esperando:

// interface Book {
//   id: string;
//   title: string;
//   authors: Array<string>;
//   publisher: string;
//   publishedDate: string;
//   description: string;
//   thumbnail: string;
//   previewLink: string;
//   averageRating: number;
//   availableCopies: 0 | 1 | 2 | 3 | 4 | 5;
//   isCheckedOutByUser: boolean; // Indica si el usuario actual tiene el libro prestado
// }

// 🎯 Tareas de Implementación:

// Cuando un usuario haga clic en el botón "Prestar" (Check Out), la UI debe actualizarse inmediatamente para reflejar el cambio.

// El libro debe aparecer de inmediato en la sección "Mis Libros" de la UI.

// Si hay un error al prestar el libro, la UI debe revertirse a su estado original.

// En cualquier caso (éxito o error), invalidar las queries para obtener el estado más reciente del servidor después de la solicitud.

// Si un usuario hace clic en el botón "Devolver" (Return), la UI debe actualizarse inmediatamente para reflejar el cambio.

// El libro debe eliminarse de inmediato de la sección "Mis Libros" de la UI.

// Si hay un error al devolver el libro, la UI debe revertirse a su estado original.

// En cualquier caso, invalidar las queries para obtener el estado más reciente del servidor después de la solicitud.

// queries.js:
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getMyBooks, getBook, checkoutBook, returnBook } from "./utils";

export function useCheckoutBook(book) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkoutBook(book.id),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["books"]
      });

      const snapshot = {
        myBooks: queryClient.getQueryData(["books", "my-books"]),
        bookDetail: queryClient.getQueryData(["books", "detail", book.id])
      };

      queryClient.setQueryData(["books", "my-books"], (previousBooks) =>
        previousBooks ? [...previousBooks, book] : undefined
      );

      queryClient.setQueryData(["books", "detail", book.id], (previousBook) =>
        previousBook
          ? {
              ...previousBook,
              isCheckedOutByUser: true,
              availableCopies: previousBook.availableCopies - 1
            }
          : undefined
      );

      return () => {
        queryClient.setQueryData(["books", "my-books"], snapshot.myBooks);
        queryClient.setQueryData(
          ["books", "detail", book.id],
          snapshot.bookDetail
        );
      };
    },
    onError: (_err, _variables, rollback) => {
      rollback?.();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["books"] });
    }
  });
}

export function useReturnBook(book) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => returnBook(book.id),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["books"]
      });

      const snapshot = {
        myBooks: queryClient.getQueryData(["books", "my-books"]),
        bookDetail: queryClient.getQueryData(["books", "detail", book.id])
      };

      queryClient.setQueryData(["books", "my-books"], (previousBooks) =>
        previousBooks
          ? previousBooks.filter((b) => b.id !== book.id)
          : undefined
      );

      queryClient.setQueryData(["books", "detail", book.id], (previousBook) =>
        previousBook
          ? {
              ...previousBook,
              isCheckedOutByUser: false,
              availableCopies: previousBook.availableCopies + 1
            }
          : undefined
      );

      return () => {
        queryClient.setQueryData(["books", "my-books"], snapshot.myBooks);
        queryClient.setQueryData(
          ["books", "detail", book.id],
          snapshot.bookDetail
        );
      };
    },
    onError: (_err, _variables, rollback) => {
      rollback?.();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["books"] });
    }
  });
}

export function useBookQuery(bookId) {
  return useQuery({
    queryKey: ["books", "detail", bookId],
    queryFn: () => getBook(bookId)
  });
}

export function useMyBooks() {
  return useQuery({
    queryKey: ["books", "my-books"],
    queryFn: getMyBooks
  });
}

// App.js:
import * as React from "react";
import { useCheckoutBook, useReturnBook } from "./queries";
import Loader from "./Loader";

export function CheckoutButton({ book }) {
  const { mutate, isPending } = useCheckoutBook(book);

  return (
    <button
      disabled={book.availableCopies === 0 || isPending}
      className="primary button"
      onClick={() => mutate()}
    >
      {isPending ? <Loader /> : "Checkout"}
    </button>
  );
}

export function ReturnButton({ book }) {
  const { mutate, isPending } = useReturnBook(book);

  return (
    <button
      disabled={isPending}
      className="secondary button"
      onClick={() => mutate()}
    >
      {isPending ? <Loader /> : "Return Book"}
    </button>
  );
}
