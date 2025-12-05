// En este desafío, validarás datos dentro de la función de consulta (query function) para asegurar que los datos devueltos tienen la estructura esperada. Para esto, utilizarás la librería Zod, la cual ya está instalada en el sandbox. Observa el código fuente para descubrir qué campos de la respuesta son utilizados en el componente. Ten en cuenta que authors y averageRating son campos opcionales.

// Tareas
// Crea un esquema para los datos devueltos por la consulta de libros.

// Valida los datos devueltos por la consulta usando el esquema.

// Desactiva los reintentos (retries) si el error es un error de validación.

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getBook } from "./utils";
import BookDetails from "./BookDetails";
import { z } from "zod";

const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string(),
  description: z.string(),
  averageRating: z.number().optional(),
  authors: z.array(z.string()).optional()
});

function useBook(bookId) {
  return useQuery({
    queryKey: ["books", { bookId }],
    queryFn: async () => {
      const data = await getBook(bookId);

      return bookSchema.parse(data);
    },
    retry: (failureCount, error) => {
      if (error instanceof z.ZodError) {
        return false;
      }
      return failureCount < 3;
    }
  });
}

function Book({ bookId }) {
  const { data, status } = useBook(bookId);

  if (status === "pending") {
    return <Loading />;
  }

  if (status === "error") {
    return <Error />;
  }

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