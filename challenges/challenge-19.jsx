// En este desafío, refactorizarás el código del Desafío de Búsqueda de Libros (Book Search Challenge) para mejorar su rendimiento. Actualmente, la aplicación está utilizando un hook personalizado useDebounce para aplicar debounce a la entrada de búsqueda. Aunque aplicar debounce puede ser una buena estrategia, todavía existe la posibilidad de que la aplicación esté obteniendo demasiados datos de la API (over fetching).

// 🎯 Tareas a Realizar:

// Eliminar el hook useDebounce del componente App.

// Utilizar una Señal de Aborto (Abort Signal) para cancelar la solicitud anterior cuando se realiza una nueva búsqueda.

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Loader from "./Loader";
import Results from "./Results";

const BASE_URL = "https://library-api.uidotdev.workers.dev";

async function getData(query, signal) {
  const url = `${BASE_URL}/books/search?q=${query}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error("Unable fetch data");
  }

  const data = await response.json();
  return data.books;
}

function useBookSearch(searchTerm) {
  return useQuery({
    queryKey: ["search", { searchTerm }],
    queryFn: ({ signal }) => getData(searchTerm, signal),
    enabled: searchTerm !== ""
  });
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
        <Results status={status} data={data} searchTerm={value} />
      </main>
    </div>
  );
}