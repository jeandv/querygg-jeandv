// En este desafío, supongamos que has recibido un ticket de soporte que detalla un problema donde el consumo de memoria de tu aplicación es demasiado alto. Has hecho algunas pruebas de rendimiento y has descubierto que la caché no se está limpiando correctamente.

// Después de discutirlo con algunos colegas, han decidido que los elementos pueden vivir en la caché durante 5 segundos antes de ser eliminados. Tu objetivo es implementar una interfaz de usuario que muestre un <Loader /> cuando los datos estén pendientes y luego muestre los datos cuando estén listos. Los datos deben ser eliminados de la caché después de 5 segundos (lo que significa que las solicitudes posteriores deberían mostrar el <Loader /> de nuevo).

// Nota: No queríamos añadir dependencias a este desafío, por lo que estamos simulando la experiencia de enrutamiento de una manera simplista. No esperamos que implementes esto en una aplicación real.

// Tareas

// Crea una consulta que obtenga un libro de un autor dado.

// Crea una consulta que obtenga un libro por un id dado.

// Renderiza un <Loader /> en el <header> si los datos del autor están pendientes.

// Renderiza un <ResultList /> con los datos de los libros si esa consulta es exitosa.

// Si un usuario hace clic en uno de los resultados, renderiza la vista <BookDetail />.

// Muestra un componente <LoadingBookDetails /> mientras los datos del libro se están obteniendo.

// Borra las entradas de la caché después de 5 segundos tanto para los libros como para los autores.


// App.js
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Loader from "./Loader";
import BookDetails from "./BookDetails";
import { getBooksByAuthor, getBook } from "./utils";
import AuthorTabs, { authors } from "./AuthorTabs";
import ResultList from "./ResultList";
import { LoadingBookDetails } from "./MessageComponents";

const gcTimeRemove = 5000;

function useBooksByAuthor(author) {
  return useQuery({
    queryKey: ["books", author],
    queryFn: () => getBooksByAuthor(author),
    gcTime: gcTimeRemove
  });
}

function useBookDetails(bookId) {
  return useQuery({
    queryKey: ["bookDetails", bookId],
    queryFn: () => getBook(bookId),
    gcTime: gcTimeRemove
  });
}

function BookList({ setBookId }) {
  const [author, setAuthor] = React.useState(authors[0]);
  const { data, isPending } = useBooksByAuthor(author);

  return (
    <main>
      <section className="book-grid">
        <header className="section-header">
          <h2>Popular Authors</h2>
          {isPending && <Loader />}
        </header>
        <AuthorTabs selectedAuthor={author} setSelectedAuthor={setAuthor} />
      </section>
      <ResultList author={author} data={data} setBookId={setBookId} />
    </main>
  );
}

function BookDetail({ bookId }) {
  const { data, isSuccess, isFetching } = useBookDetails(bookId);

  if (isFetching) {
    return <LoadingBookDetails />;
  }

  if (isSuccess) {    
    return (
      <BookDetails
        thumbnail={data?.thumbnail}
        title={data?.title}
        averageRating={data?.averageRating}
        description={data?.description}
        authors={data?.authors}
      />
    );
  }
}

export default function App() {
  const [bookId, setBookId] = React.useState(null);

  const navigateHome = (e) => {
    e.preventDefault();
    setBookId(null);
  };

  return (
    <>
      <header className="app-header">
        <h1>
          {bookId ? (
            <button className="link back" onClick={navigateHome}>
              ← Back
            </button>
          ) : (
            <span>Query Library</span>
          )}
        </h1>
      </header>
      {bookId ? (
        <BookDetail bookId={bookId} />
      ) : (
        <BookList setBookId={setBookId} />
      )}
    </>
  );
}


// BookDetails.jsx
import * as React from "react";
import { createStarString, getRatingString } from "./utils";

export default function BookDetails({
  thumbnail,
  title,
  averageRating,
  description,
  authors
}) {
  const [showMore, setShowMore] = React.useState(false);

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };
  return (
    <main className="book-detail">
      <div>
        <span className="book-cover">
          <img src={thumbnail} alt={title} />
        </span>
      </div>
      <div>
        <h2 className="book-title">{title}</h2>
        <small className="book-author">{authors.join(", ")}</small>
        <span className="book-rating">
          {createStarString(averageRating)} {getRatingString(averageRating)}
        </span>
        <div
          className={`book-synopsis ${showMore ? "expanded" : ""}`}
          dangerouslySetInnerHTML={{ __html: description }}
        />
        <button className="link" onClick={toggleShowMore}>
          {showMore ? "Show Less" : "Show More"}
        </button>
      </div>
    </main>
  );
}


// utils.js
const BASE_URL = "https://library-api.uidotdev.workers.dev";

export async function getBooksByAuthor(author) {
  const url = `${BASE_URL}/books/search?q=inauthor:${encodeURI(author)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch data");
  }

  const data = await response.json();
  return data.books;
}

export async function getBook(bookId) {
  const url = `${BASE_URL}/books/${bookId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch data");
  }

  const data = await response.json();
  return data;
}

export function createStarString(number) {
  if (typeof number !== "number") {
    return "No reviews";
  }

  const filledStars = Array.from({ length: Math.floor(number) }).map(() => "★");
  const emptyStars = Array.from({ length: 5 - filledStars.length }).map(
    () => "☆"
  );

  return filledStars.concat(emptyStars).join("");
}

export function getRatingString(number) {
  if (typeof number !== "number") {
    return "";
  }

  return `(${number} / 5)`;
}
