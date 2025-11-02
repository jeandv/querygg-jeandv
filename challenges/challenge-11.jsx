// En este desafío, nuestro objetivo es mostrar instantáneamente la vista "siguiente" al usuario cuando cambia entre diferentes autores populares. Haremos esto precargando los datos para la siguiente vista cuando el usuario pase el ratón sobre una pestaña de autor (AuthorTab). Además, los usuarios pueden hacer clic en un libro para ir a la vista de detalles del libro (BookDetailView).

// Luego, queremos precargar la entrada de la caché de los detalles del libro extrayendo los datos de la caché de la lista de libros (BookList cache). Afortunadamente, la estructura que devuelve la consulta de la lista de libros es la misma que necesitamos para la consulta de los detalles del libro. Para esta vista, tenemos datos relativamente "estáticos", por lo que una vez que se han obtenido, no necesitamos volver a solicitarlos.

// Tareas
// Precargar los datos de la lista de libros cuando el usuario pase el ratón sobre una pestaña de autor (AuthorTab).

// Rellenar previamente (Prefill) los datos para la vista de detalles del libro extrayéndolos de la entrada de caché de la lista de libros.

// Si los datos ya se han obtenido, no volver a solicitarlos.