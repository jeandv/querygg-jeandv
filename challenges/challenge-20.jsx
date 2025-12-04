// En este desafío, hemos incluido la librería react-error-boundary. Esta librería nos permite envolver nuestros componentes en un componente ErrorBoundary que capturará cualquier error que ocurra en el árbol de componentes debajo de él. A medida que tu aplicación escale, pasar a un enfoque de manejo de errores declarativo como este facilitará la gestión de errores en tu aplicación.

// Para simular una situación en la que podrías encontrar un error, hemos incluido una opción "Missing Book" (Libro Faltante) que devolverá un error 400. Tu trabajo es usar un ErrorBoundary para capturar este error y mostrar un mensaje al usuario que les dé la opción de restablecer la aplicación.

// 🎯 Tareas a Realizar
// Asegurar que React Query pase los errores al componente ErrorBoundary (usando throwOnError).

// Capturar el error y mostrar un componente Error (como Fallback Component).

// Restablecer la aplicación al estado inicial cuando se haga clic en el botón del componente Error (usando QueryErrorResetBoundary).

// Limitar los reintentos a 1 para la query de Book (usando la opción retry).


import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { getBook } from "./utils";
import BookDetails from "./BookDetails";

function useBook(bookId) {
  return useQuery({
    queryKey: ["books", { bookId }],
    queryFn: () => getBook(bookId),
    throwOnError: true,
    retry: 1
  });
}

function Book({ bookId }) {
  const { data } = useBook(bookId);

  if (data) {
    return (
      <main className="book-detail">
        <div>
          <span className="book-cover">
            <img src={data.thumbnail} alt={data.title} />
          </span>
        </div>
        <div>
          <BookDetails {...data} />
        </div>
      </main>
    );
  }

  return <Loading />;
}

function Loading() {
  return <main>Loading...</main>;
}

function Error({ error, resetErrorBoundary }) {
  return (
    <main>
      <div>{error.message}</div>
      <div>
        <button className="link" onClick={resetErrorBoundary}>
          Retry
        </button>
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
            <option value="pD6arNyKyi8C">The Return Of The King</option>
            <option value="aWZzLPhY4o0C">The Fellowship Of The Ring</option>
            <option value="12e8PJ2T7sQC">The Two Towers</option>
            <option value="WZ0f_yUgc0UC">The Return Of The King</option>
            <option value="MISSING">Book Missing</option>
          </select>
        </div>
      </header>

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            resetKeys={[selectedBookId]}
            FallbackComponent={Error}
            onReset={reset}
          >
            <Book bookId={selectedBookId} />
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}