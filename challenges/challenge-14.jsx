// Una de las funciones centrales de nuestra aplicación de biblioteca es la capacidad de prestar un libro. Cuando un usuario presta un libro, este se mostrará en el panel "Mis Libros" (y se eliminará cuando se devuelva el libro). Tu trabajo es implementar la funcionalidad para que un usuario pueda prestar un libro y luego mostrar esos libros en el panel "Mis Libros".

// Para ayudarte con este desafío, hemos creado un archivo queries que contiene todas las queries (consultas) utilizadas para obtener datos. Este patrón es útil para poder ver la estructura de todas las query keys (claves de consulta). También creamos utilidades checkoutBook y returnBook que realizan solicitudes POST al backend. Ten en cuenta que esas solicitudes POST no devuelven datos nuevos, por lo que no podemos escribir directamente en la caché.

// 📚 Tareas a Implementar
// Al hacer clic en el botón 'Prestar' ('Check Out'), se debe realizar una solicitud POST al backend para prestar el libro.

// El botón 'Prestar' debe mostrar un componente <Loader /> mientras la solicitud está en curso.

// Mostrar el libro prestado en el panel 'Mis Libros'.

// Al hacer clic en el botón 'Devolver' ('Return'), se debe realizar una solicitud POST al backend para devolver el libro.

// El botón 'Devolver' debe mostrar un componente <Loader /> mientras la solicitud está en curso.

// Eliminar el libro devuelto del panel 'Mis Libros'.