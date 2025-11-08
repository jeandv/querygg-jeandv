// En este desafío, vas a añadir paginación a la Librería de Consultas. Para ayudarte con esto, hemos creado un componente <Pagination /> que puedes usar.

// <Pagination totalPages={100} activePage={1} setActivePage={() => {}} />

// Tu trabajo consiste en implementar una consulta que pueda obtener una página de resultados de la API utilizando una función getData. La función getData toma dos argumentos: un término de búsqueda (que hemos codificado a "The Lord of the Rings" para este desafío) y un número de página. Devuelve un objeto con las siguientes propiedades:

// const { books, totalPages, currentPage } = await getData(
//   "The Lord of the Rings", // el término de búsqueda
//   1 // número de página
// );

// Finalmente, para que la experiencia de paginación se sienta más rápida (y para evitar mostrar spinners), debes mostrar los datos de la página anterior mientras se están cargando los datos de la página siguiente.

// Nota: La paginación de esta API comienza en 1, no en 0.

// Tareas

// Cuando un usuario haga clic en el botón de la página siguiente, solicita la siguiente página de resultados.

// Cuando un usuario haga clic en el botón de la página anterior, solicita la página anterior de resultados.

// Cuando un usuario haga clic en un número de página, solicita esa página de resultados.

// Muestra los datos de la página anterior mientras se carga la página siguiente.

// Establece la opacidad del componente <BookList /> a .5 cuando los datos sean placeholder data (datos de marcador de posición).


import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createStarString, getData } from "./utils";
import { ErrorMessage, Loading } from "./MessageComponents";
import Pagination from "./Pagination";

const searchTerm = "The Lord of the Rings";
function useSearch(pageNumber) {
  return useQuery({
    queryKey: ["search", { searchTerm, pageNumber}],
    queryFn: () => getData(searchTerm, pageNumber),
    placeholderData: (previousData) => previousData
  });
}

function BookList({ books, isPlaceholderData }) {
  return (
    <ul style={{ transition: "all ease 300ms", opacity: isPlaceholderData ? ".5" : "1" }}>
      {books.map((book) => {
        return (
          <li key={book.id}>
            <span className="book-cover">
              <img src={book.thumbnail} alt={book.title} />
            </span>
            <h3 className="book-title">{book.title}</h3>
            <small className="book-author">{book.authors.join(", ")}</small>
            <span className="book-rating">
              {createStarString(book.averageRating)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PaginatedBookList() {
  const [page, setPage] = React.useState(1)
  const { data, status, isPlaceholderData } = useSearch(page);

  if (status === "pending") {
    return <Loading />;
  }

  if (status === "error") {
    return <ErrorMessage />;
  }

  return (
    <section className="search-results book-grid">
      <div>
        <header>
          <h2>
            Search results for <strong>{searchTerm}</strong>
          </h2>
          <Pagination
            totalPages={100}
            activePage={page}
            setActivePage={setPage}
          />
        </header>
        <BookList books={data.books} isPlaceholderData={isPlaceholderData} />
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
      </header>
      <main>
        <PaginatedBookList />
      </main>
    </div>
  );
}
