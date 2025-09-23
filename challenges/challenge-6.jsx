// En este desafío, tu tarea es crear un componente de búsqueda que obtenga datos de una API a demanda. Dado que no queremos hacer una petición cada vez que el usuario escribe un carácter, necesitaremos desacelerar (debounce) la consulta. Incluimos el hook useDebounce de @uidotdev/usehooks. Puedes leer más sobre él aquí. También creamos una función de utilidad getData para obtener los datos basándose en el término de búsqueda.

// https://usehooks.com/usedebounce

// Usando una combinación de estas herramientas, crea un componente <BookSearch /> que renderice una lista de libros basándose en el término de búsqueda del usuario. Si no hay resultados, muestra un componente <NoResults />. Para completar la experiencia, si la consulta aún se está ejecutando, muestra un componente <Loader />.

// Tareas

// Crea una consulta que obtenga datos basándose en un término de búsqueda.

// Desacelera la consulta para que solo se actualice después de que el usuario haya dejado de escribir durante 300ms.

// No ejecutes la consulta si el término de búsqueda está vacío.

// Muestra el componente <HasNotSearched /> si el usuario no ha realizado una búsqueda.

// Muestra el componente <ErrorMessage /> si hay un error al obtener los datos.

// Muestra el componente <Searching /> cuando la consulta se esté ejecutando.

// Muestra el componente <NoResults /> si la consulta es válida pero no se devuelven resultados.

// Muestra el componente <ResultList /> con los resultados de la consulta.

// App.js
import * as React from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import Loader from "./Loader";
import {
  ErrorMessage,
  NoResults,
  Searching,
  HasNotSearched
} from "./MessageComponents";

import { getData } from "./utils";
import ResultList from "./ResultList";

function useBookSearch(searchTerm) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // useDebounce lo que hace es: Desacelerar el término de búsqueda para evitar peticiones excesivas https://usehooks.com/usedebounce

  return useQuery({
    queryKey: ["books", debouncedSearchTerm],
    queryFn: () => getData(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm,
  });
}

function Results({ data, searchTerm, status, isLoading }) {
  if (isLoading) {
    return <Searching />;
  }

  if (status === "error") {
    return <ErrorMessage />;
  }

  if (data?.length === 0) {
    return <NoResults />;
  }

  if (!searchTerm) {
    return <HasNotSearched />;
  }
  
  if (status === "success") {
    return <ResultList searchTerm={searchTerm} data={data} />;
  }
}

export default function App() {
  const [value, setValue] = React.useState("");
  const { data, status, isLoading } = useBookSearch(value);

  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
        <div className="search-wrapper">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="search-input"
            type="text"
            name="search"
            id="search"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Search books"
          />
          {isLoading && <Loader />}
        </div>
      </header>
      <main>
        <Results status={status} data={data} searchTerm={value} isLoading={isLoading} />
      </main>
    </div>
  );
}

// MessageComponents.jsx
export function NoResults() {
  return <div>Sorry, no results found ...</div>;
}

export function ErrorMessage() {
  return <div>Woops there was an error...</div>;
}

export function Searching() {
  return <div>Searching...</div>;
}

export function HasNotSearched() {
  return <div>Please search for a book</div>;
}

// ResultList.jsx
import { createStarString } from "./utils";

function Book({ thumbnail, title, authors, averageRating }) {
  return (
    <li>
      <span className="book-cover">
        <img src={thumbnail} alt={title} />
      </span>
      <h3 className="book-title">{title}</h3>
      <small className="book-author">{authors.join(", ")}</small>
      <span className="book-rating">{createStarString(averageRating)}</span>
    </li>
  );
}

export default function ResultList({ searchTerm, data }) {
  return (
    <section className="search-results book-grid">
      <div>
        <h2>
          Search results for <strong>{searchTerm}</strong>
        </h2>
        <ul>
          {data.map((book) => {
            return (
              <Book
                key={book.id}
                thumbnail={book.thumbnail}
                title={book.title}
                authors={book.authors}
                averageRating={book.averageRating}
              />
            );
          })}
        </ul>
      </div>
    </section>
  );
}

