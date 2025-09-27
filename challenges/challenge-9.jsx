// Para este desafío, construirás una vista de "detalles de la reseña" que muestra una sola reseña. Imagina que la URL para esta página es algo como /review/2, donde 2 es el ID de la reseña a mostrar (no necesitas preocuparte por el enrutamiento para este desafío). Si obtenemos la reseña con un ID de 2, obtendremos una respuesta que se ve así:

// {
//   "reviewId": 2,
//   "userId": "46555c8fcafe4047b04f541ccd2fd8562f15fd3ce7173c2c654419e53c175df6",
//   "bookId": "pD6arNyKyi8C",
//   "rating": 5,
//   "title": "Enchanting",
//   "text": "The Hobbit captivates with its enchanting world and lovable characters, ...",
//   "reviewDate": "2023-12-11T19:57:36.529Z"
// }

// Como puedes ver, hay un bookId en la respuesta, y debido a que el diseño para esta vista incluye la miniatura del libro, también necesitamos obtener los detalles del libro usando la función getBook. Tu desafío es implementar las consultas useReview y useBookDetails para que devuelvan los datos necesarios para renderizar la vista. Asegúrate de renderizar la reseña tan pronto como esté disponible. La miniatura puede renderizarse tan pronto como la consulta de los detalles del libro haya finalizado.

// Tareas

// Crea una consulta que obtenga los detalles de la reseña para un ID de reseña dado.

// Crea una consulta que obtenga los detalles del libro para un ID de libro dado.

// Renderiza el componente <ReviewDetail /> con los datos de la consulta de la reseña tan pronto como esté disponible.

// Renderiza la miniatura del libro una vez que la consulta del libro haya finalizado.

// Si hay un error con cualquiera de las consultas, renderiza un mensaje de error.


import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getBook, getReviewById, createStarString } from "./utils";
import { Loading, Error } from "./MessageComponents";

function useReview(reviewId = 2) {
  return useQuery({
    queryKey: ["review", reviewId],
    queryFn: async () => getReviewById(reviewId),
  });
}

function useBookDetails(bookId) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => getBook(bookId),
    enabled: bookId !== undefined
  });
}

function ReviewDetail() {
  const reviewQuery = useReview(2)
  const bookQuery = useBookDetails(reviewQuery?.data?.bookId)

  if (reviewQuery.status === 'error') {
    return <Error />;
  }

  if (reviewQuery?.data) {
    return (
      <main className="book-detail">
        <div>
          <span className="book-cover">
            <img src={bookQuery?.data?.thumbnail} alt={bookQuery?.data?.title} />
          </span>
        </div>
        <div className="reviews">
          <h2>Review</h2>
          <ul>
            <li key={reviewQuery?.data?.reviewId}>
              <h3>{reviewQuery?.data?.title}</h3>
              <small>by Anonymous</small>
              <span className="book-rating">
                {createStarString(reviewQuery?.data?.rating)}
              </span>
              <p>{reviewQuery?.data?.text}</p>
            </li>
          </ul>
        </div>
      </main>
    );
  }

  return <Loading />;
}

export default function App() {
  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
      </header>
      <ReviewDetail />
    </div>
  );
}
