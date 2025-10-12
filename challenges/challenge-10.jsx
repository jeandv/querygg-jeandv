// En este desafío, estamos añadiendo reseñas a la vista de Detalles del Libro. Mientras se diseñaba esta característica, el equipo decidió que las reseñas debían almacenarse en caché por separado de los detalles del libro (para facilitar la adición, edición y eliminación de los datos dinámicos de las reseñas). Esto significa que las reseñas se obtendrán en paralelo con los detalles del libro.

// Tu trabajo es escribir un hook personalizado que obtenga los detalles del libro y las reseñas en paralelo y los devuelva como un único objeto, que la interfaz de usuario pueda utilizar para renderizar los detalles del libro y las reseñas. La API para tu hook personalizado debería verse así:

// const { isPending, isError, reviews, book } = useBookDetails(bookId);
// La consulta del libro debe ser almacenada en caché con una clave ["book", { bookId }], y la consulta de las reseñas debe ser almacenada en caché con una clave ["reviews", { bookId }].

// Tareas

// Si alguna consulta está "pendiente" (pending), el indicador isPending debe ser true.

// Si alguna consulta tiene un error, el indicador isError debe ser true.

// Si todas las consultas son exitosas, deben devolverse las propiedades reviews y book.

// Cada consulta debe tener su propia entrada de caché.

//App.jsx
import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { getBook, getReviewsForBook } from "./utils";
import ReviewFormSection from "./ReviewFormSection";
import ReviewsSection from "./ReviewsSection";
import BookDetails from "./BookDetails";
import { Error, Loading } from "./MessageComponents";

function useBookDetails(bookId) {
  const results = useQueries({
    queries: [
      {
        queryKey: ["book", { bookId }],
        queryFn: () => getBook(bookId),
        enabled: !!bookId,
      },
      {
        queryKey: ["reviews", { bookId }],
        queryFn: () => getReviewsForBook(bookId),
        enabled: !!bookId,
      },
    ],
  })

  const bookResult = results[0];
  const reviewsResult = results[1];

  const isPending = bookResult.isPending || reviewsResult.isPending;
  const isError = bookResult.isError || reviewsResult.isError;
  
  return {
    isPending,
    isError,
    book: bookResult.data,
    reviews: reviewsResult.data,
  };
}

function Book({ bookId }) {
  const { isPending, isError, reviews, book } = useBookDetails(bookId);

  if (isError) {
    return <Error />;
  }

  if (isPending) {
    return <Loading />;
  }

  return (
    <main className="book-detail">
      <div>
        <span className="book-cover">
          <img src={book?.thumbnail} alt={book?.title} />
        </span>
      </div>
      <div>
        <BookDetails book={book} />
        <ReviewFormSection />
        <ReviewsSection reviews={reviews} />
      </div>
    </main>
  );
}

export default function App() {
  const [selectedBookId, setSelectedBookId] = React.useState("pD6arNyKyi8C");

  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
        <div className="select">
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            <option value="pD6arNyKyi8C">The Hobbit</option>
            <option value="aWZzLPhY4o0C">The Fellowship Of The Ring</option>
            <option value="12e8PJ2T7sQC">The Two Towers</option>
            <option value="WZ0f_yUgc0UC">The Return Of The King</option>
          </select>
        </div>
      </header>

      <Book bookId={selectedBookId} />
    </div>
  );
}
