// En este desafío, estamos añadiendo reseñas a la vista de Detalles del Libro. Mientras se diseñaba esta característica, el equipo decidió que las reseñas debían almacenarse en caché por separado de los detalles del libro (para facilitar la adición, edición y eliminación de los datos dinámicos de las reseñas). Esto significa que las reseñas se obtendrán en paralelo con los detalles del libro.

// Tu trabajo es escribir un hook personalizado que obtenga los detalles del libro y las reseñas en paralelo y los devuelva como un único objeto, que la interfaz de usuario pueda utilizar para renderizar los detalles del libro y las reseñas. La API para tu hook personalizado debería verse así:

// const { isPending, isError, reviews, book } = useBookDetails(bookId);
// La consulta del libro debe ser almacenada en caché con una clave ["book", { bookId }], y la consulta de las reseñas debe ser almacenada en caché con una clave ["reviews", { bookId }].

// Tareas

// Si alguna consulta está "pendiente" (pending), el indicador isPending debe ser true.

// Si alguna consulta tiene un error, el indicador isError debe ser true.

// Si todas las consultas son exitosas, deben devolverse las propiedades reviews y book.

// Cada consulta debe tener su propia entrada de caché.