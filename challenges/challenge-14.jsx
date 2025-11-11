// Una de las funciones centrales de nuestra aplicación de biblioteca es la capacidad de prestar un libro. Cuando un usuario presta un libro, este se mostrará en el panel "Mis Libros" (y se eliminará cuando se devuelva el libro). Tu trabajo es implementar la funcionalidad para que un usuario pueda prestar un libro y luego mostrar esos libros en el panel "Mis Libros".

// Para ayudarte con este desafío, hemos creado un archivo queries que contiene todas las queries (consultas) utilizadas para obtener datos. Este patrón es útil para poder ver la estructura de todas las query keys (claves de consulta). También creamos utilidades checkoutBook y returnBook que realizan solicitudes POST al backend. Ten en cuenta que esas solicitudes POST no devuelven datos nuevos, por lo que no podemos escribir directamente en la caché.

// 📚 Tareas a Implementar
// Al hacer clic en el botón 'Prestar' ('Check Out'), se debe realizar una solicitud POST al backend para prestar el libro.

// El botón 'Prestar' debe mostrar un componente <Loader /> mientras la solicitud está en curso.

// Mostrar el libro prestado en el panel 'Mis Libros'.

// Al hacer clic en el botón 'Devolver' ('Return'), se debe realizar una solicitud POST al backend para devolver el libro.

// El botón 'Devolver' debe mostrar un componente <Loader /> mientras la solicitud está en curso.

// Eliminar el libro devuelto del panel 'Mis Libros'.


// ActionBUtton.jsx
import * as React from "react";
import Loader from "./Loader";
import { useCheckoutBook, useReturnBook } from "./queries";

export function CheckoutButton({ book }) {
  const { mutate, isPending } = useCheckoutBook(book);

  return (
    <button
      disabled={book.availableCopies === 0 || isPending}
      className="primary button"
      onClick={() => mutate()}
    >
      {isPending ? <Loader /> : "Checkout"}
    </button>
  );
}

export function ReturnButton({ book }) {
  const { mutate, isPending } = useReturnBook(book);

  return (
    <button
      disabled={isPending}
      className="secondary button"
      onClick={() => mutate()}
    >
      {isPending ? <Loader /> : "Return Book"}
    </button>
  );
}

// queries.jsx
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getMyBooks, getBook, checkoutBook, returnBook } from "./utils";

export function useCheckoutBook(book) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkoutBook(book.id),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ["books"] });
    }
  });
}

export function useReturnBook(book) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => returnBook(book.id),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ["books"] });
    }
  });
}

export function useBookQuery(bookId) {
  return useQuery({
    queryKey: ["books", "detail", bookId],
    queryFn: () => getBook(bookId)
  });
}

export function useMyBooks() {
  return useQuery({
    queryKey: ["books", "my-books"],
    queryFn: getMyBooks
  });
}

// utils.js
const BASE_URL = "https://library-api.uidotdev.workers.dev";

export async function getBook(bookId) {
  const url = `${BASE_URL}/books/${bookId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch book details");
  }

  const data = await response.json();
  return data;
}

export async function getMyBooks() {
  const url = `${BASE_URL}/books/my-books`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch your checked out books");
  }

  const data = await response.json();
  return data;
}

export async function checkoutBook(bookId) {
  const url = `${BASE_URL}/checkout/${bookId}`;
  const response = await fetch(url, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Unable checkout book");
  }

  const data = await response.json();
  return data;
}

export async function returnBook(bookId) {
  const url = `${BASE_URL}/return/${bookId}`;
  const response = await fetch(url, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Unable return book");
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
