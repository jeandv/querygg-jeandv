// En este desafío, nuestro objetivo es mostrar instantáneamente la vista "siguiente" al usuario cuando cambia entre diferentes autores populares. Haremos esto precargando los datos para la siguiente vista cuando el usuario pase el ratón sobre una pestaña de autor (AuthorTab). Además, los usuarios pueden hacer clic en un libro para ir a la vista de detalles del libro (BookDetailView).

// Luego, queremos precargar la entrada de la caché de los detalles del libro extrayendo los datos de la caché de la lista de libros (BookList cache). Afortunadamente, la estructura que devuelve la consulta de la lista de libros es la misma que necesitamos para la consulta de los detalles del libro. Para esta vista, tenemos datos relativamente "estáticos", por lo que una vez que se han obtenido, no necesitamos volver a solicitarlos.

// Tareas
// Precargar los datos de la lista de libros cuando el usuario pase el ratón sobre una pestaña de autor (AuthorTab).

// Rellenar previamente (Prefill) los datos para la vista de detalles del libro extrayéndolos de la entrada de caché de la lista de libros.

// Si los datos ya se han obtenido, no volver a solicitarlos.


import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BookDetails from "./BookDetails";
import { getBooksByAuthor, getBook, createStarString } from "./utils";
import { BookDetailLoading } from "./MessageComponents";
import Loader from "./Loader";

const authors = [
  "J.K. Rowling",
  "C.S. Lewis",
  "J.R.R Tolkien",
  "George R.R. Martin"
];

function useBook(bookId) {
  return useQuery({
    queryKey: ["books", { bookId }],
    queryFn: () => getBook(bookId)
  });
}

function useBooksByAuthor(author) {
  return useQuery({
    queryKey: ["books", { author }],
    queryFn: () => getBooksByAuthor(author)
  });
}

function BookListItem({
  bookId,
  setBookId,
  thumbnail,
  title,
  authors,
  averageRating
}) {
  const handleClick = (e) => {
    e.preventDefault();
    setBookId(bookId);
  };

  return (
    <li>
      <a href="#" onClick={handleClick} className="book-cover">
        <img src={thumbnail} alt="The Hobbit" />
      </a>
      <h3 className="book-title">
        <a href="#" onClick={handleClick}>
          {title}
        </a>
      </h3>
      <small className="book-author">{authors?.join(", ")}</small>
      <span className="book-rating">{createStarString(averageRating)}</span>
    </li>
  );
}

function AuthorTab({ isActive, author, setSelectedAuthor }) {
  return (
    <button
      className={`category ${isActive ? "active" : ""}`}
      onClick={() => setSelectedAuthor(author)}
    >
      {author}
    </button>
  );
}

function PopularAuthorTabs({ authors, selectedAuthor, setSelectedAuthor }) {
  return (
    <div className="category-list-container">
      <div className="category-list">
        {authors.map((author) => (
          <AuthorTab
            key={author}
            author={author}
            isActive={author === selectedAuthor}
            setSelectedAuthor={setSelectedAuthor}
          />
        ))}
      </div>
    </div>
  );
}

function BookListView({ setBookId, selectedAuthor, setSelectedAuthor }) {
  const { data, isLoading } = useBooksByAuthor(selectedAuthor);
  const hasResults = data?.length > 0;
  return (
    <main>
      <section className="book-grid">
        <h2>Popular Authors</h2>
        <PopularAuthorTabs
          authors={authors}
          selectedAuthor={selectedAuthor}
          setSelectedAuthor={setSelectedAuthor}
        />
      </section>
      <section className="search-results book-grid">
        <header className="section-header">
          <h2>
            Book results for <strong>{selectedAuthor}</strong>
          </h2>
          {isLoading && <Loader />}
        </header>
        {hasResults && (
          <ul>
            {data.map((book) => (
              <BookListItem
                key={book.id}
                bookId={book.id}
                thumbnail={book.thumbnail}
                title={book.title}
                averageRating={book.averageRating}
                authors={book.authors}
                setBookId={setBookId}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function BookDetailView({ bookId }) {
  const { data } = useBook(bookId);

  if (data) {
    return (
      <BookDetails
        id={bookId}
        thumbnail={data.thumbnail}
        title={data.title}
        description={data.description}
        authors={data.authors}
        averageRating={data.averageRating}
      />
    );
  }

  return <BookDetailLoading />;
}

export default function App() {
  const [bookId, setBookId] = React.useState(null);
  const [selectedAuthor, setSelectedAuthor] = React.useState(authors[0]);

  const navigateHome = (e) => {
    e.preventDefault();
    setBookId(null);
  };

  return (
    <React.Fragment>
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
        <BookDetailView bookId={bookId} />
      ) : (
        <BookListView
          setBookId={setBookId}
          selectedAuthor={selectedAuthor}
          setSelectedAuthor={setSelectedAuthor}
        />
      )}
    </React.Fragment>
  );
}
