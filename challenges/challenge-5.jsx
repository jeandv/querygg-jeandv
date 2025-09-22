// En este desafío, continuaremos implementando un sistema de préstamo de libros de biblioteca. Cada libro tiene un campo checkedOut que es true si el libro está prestado actualmente. Queremos aprovechar staleTime para mostrar un indicador visual de si el estado de checkedOut está actualizado.

// Para esta aplicación, podemos considerar que una consulta está "obsoleta" después de 5 segundos. Cuando los datos están obsoletos, queremos mostrar un mensaje debajo del botón de préstamo que diga: "Estos datos están obsoletos. Haz clic aquí para actualizar." (Hemos creado este componente para que lo renderices). Cuando el usuario haga clic en el enlace de actualización, queremos volver a obtener los datos manualmente. También queremos mostrar un mensaje debajo del botón de préstamo cuando una actualización en segundo plano esté en curso.

// Tareas

// Crea una consulta que marque los datos como obsoletos después de 5 segundos.

// Cuando los datos estén obsoletos, muestra el componente <StaleMessage /> debajo del botón de préstamo.

// Permite al usuario actualizar manualmente los datos obsoletos usando la función refetch devuelta por useQuery.

// Cuando una actualización en segundo plano esté en curso, muestra el componente <BackgroundUpdateInProgress /> debajo del botón de préstamo.

// Si los datos están actualizados y no hay una actualización en segundo plano en curso, muestra el componente <UpToDate /> debajo del botón de préstamo.


import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Loader from "./Loader";
import {
  UpToDate,
  BackgroundUpdateInProgress,
  StaleMessage,
  ErrorMessage
} from "./MessageComponents";
import { getData, createStarString, getRatingString } from "./utils";

function useBook(bookId) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getData(bookId),
    staleTime: 5 * 1000
  });
}

function Book({ bookId }) {

  const { data, refetch, isError, isLoading, isFetching, isStale } = useBook(bookId)

  if (isError) {
    return <ErrorMessage />;
  }

  if (isLoading) {
    return (
      <main>
        <Loader />
      </main>
    );
  }

  return (
    <main className="book-detail">
      <div>
        <span className="book-cover">
          <img src={data?.thumbnail} alt={data?.title} />
        </span>
      </div>
      <div>
        <h2 className="book-title">{data?.title}</h2>
        <small className="book-author">{data?.authors.join(", ")}</small>
        <span className="book-rating">
          {createStarString(data?.averageRating)}{" "}
          {getRatingString(data?.averageRating)}
        </span>
        <div className="checkout-wrapper">
          <button className="primary">Check Out</button>
          {
            isFetching 
            ? <BackgroundUpdateInProgress />
            : isStale
            ? <StaleMessage refetch={() => refetch()} /> 
            : <UpToDate />
          }
        </div>
        <div
          className={`book-synopsis`}
          dangerouslySetInnerHTML={{ __html: data?.description }}
        />
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
