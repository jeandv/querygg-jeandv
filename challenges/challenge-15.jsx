// 📝 Desafío: Añadir Reseñas de Libros
// En este desafío, queremos añadir la funcionalidad para que los usuarios puedan agregar su propia reseña a un libro. Para este ejercicio, hemos creado una función postReviewData que toma un único argumento, reviewData, el cual es un objeto con la siguiente estructura:

// {
//   bookId: string, // ID del libro
//   rating: number, // Valoración del 1 al 5
//   title: string,  // Título de la reseña
//   text: string,   // Cuerpo del texto (limitado a 500 caracteres)
// }

// Tu trabajo consiste en implementar la interfaz de usuario (UI). Mientras el formulario se está enviando, debes mostrar un componente <Loader /> dentro del botón y deshabilitarlo para que el usuario no pueda enviar el formulario varias veces. Si hay un error al crear la reseña, muestra un mensaje de error. Si la reseña se crea exitosamente, limpia el formulario y muestra la nueva reseña en la lista de reseñas.

// Tareas a Cumplir

// Manejar los envíos del formulario con una mutación para crear una nueva reseña.

// Deshabilitar el botón de envío y mostrar un componente <Loader /> mientras se crea la nueva reseña.

// Si hay un error al crear la reseña, mostrar un mensaje de error.

// Si la reseña se crea exitosamente, limpiar el formulario y mostrar la nueva reseña en la lista de reseñas.