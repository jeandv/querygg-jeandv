// En este desafío, hay un menú simple (`<select>`) con una lista de libros. Cuando se selecciona un libro, la aplicación debe obtener los detalles de ese libro de la API y mostrarlos.
//  Ya hemos implementado una función `getData`; tu tarea es crear una consulta que obtenga los detalles del libro basándose en el libro seleccionado.

// Tarea*

// Crea una consulta que acepte un parámetro `bookId`.
// Cuando se seleccione un libro, renderiza los detalles del libro.
// Cuando un libro esté cargando, renderiza el componente `<Loading />`.
// Si hay un error al obtener el libro, renderiza el componente `<Error />`.

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createStarString, getRatingString } from "./utils";

const BASE_URL = "https://library-api.uidotdev.workers.dev";

async function getData(bookId) {
  const url = `${BASE_URL}/books/${bookId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch data");
  }

  const data = await response.json();
  return data;
}

function useBook(bookId) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getData(bookId)
  });
}

function Book({ bookId }) {
  const { data, isError, isPending } = useBook(bookId);

  if (isError) {
    return <Error />;
  }

  if (isPending) {
    return <Loading />;
  }

  if (!data) return null;
  
  return (
    <main className="book-detail">
      <div>
        <span className="book-cover">
          <img src={data?.thumbnail} alt={data?.title} />
        </span>
      </div>
      <div>
        <h2 className="book-title">{data?.title}</h2>
        <small className="book-author">{data?.authors?.join(", ")}</small>
        <span className="book-rating">
          {createStarString(data?.averageRating)}{" "}
          {getRatingString(data?.averageRating)}
        </span>
      </div>
    </main>
  );
}

function Loading() {
  return <main>Loading...</main>;
}

function Error() {
  return <main>Woops there was an error...</main>;
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
